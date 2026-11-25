/* Hari Express — gestionale di trasporti in 3D con cel shading (three.js r160 condiviso con Hari Rally e Hari Fishing).
 * Qui: create(), stato, ciclo a passo fisso (20 passi al secondo × velocità), strumenti di costruzione, eventi, suoni,
 * schermo intero, pausa, salvataggio e registrazione del gioco. I moduli sono montati col contesto condiviso X:
 *   express-art.js (testi, icone, card, tutorial) · express-3d.js (renderer, terreno, acqua, alberi, case, industrie)
 *   express-tracks.js (strade, binari, stazioni, semafori, anteprima) · express-vehicles.js (mezzi a istanze)
 *   express-hud.js (barra, obiettivo, Hari, strumenti, schede, modalità, etichette) · express-input.js (camera, gesti)
 * Logica pura: express-map.js, express-net.js, express-sim.js, express-logic.js (HH.express).
 * Due "posti" di salvataggio: 'express' (Campagna) ed 'express@free' (Libera, sbloccata al livello FREE_AT).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.games = HH.games || [];
  const A = HH.expressArt, { L } = A;
  const TPS = 20;                      // passi della simulazione al secondo a ×1 (1 ora = 1,2 s, 1 giorno = 28,8 s)
  const coarse = () => !!(G.matchMedia && G.matchMedia('(pointer: coarse)').matches);
  let rmAt = -1e9, rmVal = false;
  const reduce = () => { const n = Date.now(); if (n - rmAt > 1000) { rmAt = n; rmVal = !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); } return rmVal; };
  const sget = (k, d) => { try { const v = HH.store && HH.store.get && HH.store.get(k); return v === undefined || v === null ? d : v; } catch (e) { return d; } };
  const sset = (k, v) => { try { if (HH.store && HH.store.set) HH.store.set(k, v); } catch (e) { /* niente salvataggio */ } };
  const slot = () => (sget('express:mode', 'level') === 'free' ? 'express@free' : 'express');

  function create(el, ctx, saved) {
    const E = HH.express, T = G.THREE, SKY = HH.expressSky;
    let s = null, raf = 0, last = 0, acc = 0, paused = false, alive = true, timers = [], dayN = 0, glOk = true;
    const later = (fn, ms) => { const id = setTimeout(() => { if (alive) fn(); }, ms); timers.push(id); return id; };
    const sfx = (k, ...a) => { const S1 = ctx.sfx && ctx.sfx[k] ? ctx.sfx : HH.audio && HH.audio.sfx; if (S1 && typeof S1[k] === 'function') S1[k](...a); };
    const perf = { n: 0, sum: 0, max: 0, calls: 0, tris: 0 };
    let slowF = 0, fastF = 0, themeAt = 0;
    // ora del giorno della scena = l'orologio della simulazione (più la frazione di passo, per un cielo fluido);
    // dep = profondità della notte, che scivola verso quella della velocità (niente sfarfallio a ×4)
    let tod = SKY.START, dep = 1, alwaysDay = !!sget('express:alwaysDay', false);
    const skyNow = () => SKY.light(tod, alwaysDay, dep);

    const X = {
      el, T, ui: {}, tool: 'info', picking: false, land: false, alive: true, pr: 1,
      get s() { return s; }, get W() { return s ? E.world(s) : null; }, get paused() { return paused; },
      prMax: () => 1.5, reduce, sfx, maxVehicles: () => (coarse() ? 80 : 200),
      pause: () => pause(), act: (a) => act(a),
    };
    Object.defineProperty(X, 'sub', { get() { return subOf(X.tool); }, set() {} });
    const subs = { rail: 'track', stop: 'station' };
    const subOf = (t) => subs[t] || null;

    // moduli
    const hud = HH.expressHud(X); X.hud = hud;
    hud.build();
    const D3 = HH.express3d(X); Object.assign(X, D3);
    const TR = HH.expressTracks(X); X.hR = TR.hR;
    const VE = HH.expressVehicles(X);
    const IN = HH.expressInput(X); X.cam = IN.cam;

    /* ---------- strumenti ---------- */
    X.setTool = (t) => {
      if (X.picking) endPick(true);
      X.tool = t; sfx('tap');
      cancelBuild();
      hud.paintTools();
      if (hud.isOpen() && hud.sheetKind !== 'new' && hud.sheetKind !== 'route') hud.close();
    };
    X.setSub = (k) => { subs[X.tool] = k; sfx('tap'); cancelBuild(); hud.paintTools(); };
    X.blocked = () => !X.ui.home.hidden;
    X.togglePause = () => togglePause();
    X.alwaysDay = () => alwaysDay;
    X.toggleDay = () => { alwaysDay = !alwaysDay; sset('express:alwaysDay', alwaysDay); sfx('tap'); hud.sky(skyNow()); };
    X.cycleSpeed = () => { const order = [1, 2, 4, 0]; const i = order.indexOf(s.speed); E.act(s, { k: 'speed', v: order[(i + 1) % order.length] }); hud.hud(); ctx.changed(); };
    X.escape = () => { if (X.picking) { endPick(); return; } if (!X.ui.confirm.hidden) { cancelBuild(); return; } if (hud.isOpen()) { hud.close(); return; } if (!X.ui.home.hidden && s) { hud.home(false); } };
    X.campLevel = () => { try { return HH.progress && HH.progress.get ? HH.progress.get('express').level : ctx.level; } catch (e) { return ctx.level; } };
    X.freeOpts = () => sget('express:free', {});
    X.goMode = (mode, opts) => {
      if (mode === 'free') sset('express:free', opts);
      const want = mode === 'free' ? 'free' : 'level';
      if (want === (s && s.mode)) {
        if (mode === 'free') { begin(E.newFree(opts)); ctx.changed({ reset: true }); }
        return;
      }
      if (ctx.reslot) ctx.reslot(() => sset('express:mode', want));
      else { sset('express:mode', want); begin(want === 'free' ? E.newFree(opts || X.freeOpts()) : E.newLevel(ctx.level, Math.random)); }
    };
    X.onSheet = (kind) => { if (!kind) TR.overlay([], ''); };
    X.showArea = (st) => TR.overlay(TR.catchment(st), 'area' + st.id + ':' + st.tiles.length);
    X.startPick = () => { X.picking = true; X.ui.sheet.hidden = true; hud.paintTools(); };
    X.endPick = () => endPick();
    function endPick(silent) { X.picking = false; hud.hint(''); hud.paintTools(); if (!silent && hud.draftOpen()) hud.drawDraft(); }

    /* ---------- azioni ---------- */
    const ERR = { money: 'ex_err_money', blocked: 'ex_err_blocked', busy: 'ex_err_busy', axis: 'ex_err_axis', slope: 'ex_err_slope', town: 'ex_err_town',
      orders: 'ex_err_orders', line: 'ex_err_line', empty: 'ex_err_empty', size: 'ex_err_size', noroute: 'ex_err_noroute', locked: 'ex_err_blocked', max: 'ex_err_busy',
      unreach: 'ex_err_orders', tunnel: 'ex_err_tunnel', long_b: 'ex_err_long_b', long_t: 'ex_err_long_t', bank: 'ex_err_bank', portal: 'ex_err_portal' };
    // perché un ponte o una galleria dritti non si possono fare (con la lunghezza massima)
    const why = (k) => L(ERR[k] || 'ex_err_noroute', { n: k === 'long_t' ? HH.expressNet.MAX_TUNNEL : HH.expressNet.MAX_BRIDGE });
    function act(a) {
      if (!s) return { ok: false };
      if (a.k === 'buy' && s.veh.length >= X.maxVehicles()) { hud.hint(L('ex_err_busy'), 2500); sfx('bad'); return { ok: false, err: 'max' }; }
      const r = E.act(s, a);
      if (!r.ok) { if (r.err !== 'over' && r.err !== 'unreach') { hud.hint(L(ERR[r.err] || 'ex_err_blocked'), 2600); sfx('bad'); } else if (r.err === 'unreach') sfx('bad'); return r; }
      if (a.k === 'build' || a.k === 'station') sfx('place');
      else if (a.k === 'demolish') sfx('boing');
      else if (a.k === 'signal' || a.k === 'oneway') sfx('mark');
      else if (a.k === 'sell') sfx('cash');
      hud.hud(); hud.refresh();
      ctx.changed();
      later(() => hud.coach(), 400);
      return r;
    }

    /* ---------- costruzione col trascinamento ---------- */
    let op = null, prev = null;
    const kindOf = () => (X.tool === 'rail' ? 'rail' : 'road');
    X.opStart = (t) => {
      if (!s || E.isOver(s)) return;
      cancelBuild();
      op = { a: t, b: t, seen: new Set() };
      if (X.tool === 'demolish') { op.seen.add(t); act({ k: 'demolish', tile: t }); }
      else X.opMove(t);
    };
    function line(a, b) {
      const w = X.W.w, ax = a % w, ay = (a / w) | 0, bx = b % w, by = (b / w) | 0;
      const horiz = Math.abs(bx - ax) >= Math.abs(by - ay), out = [];
      const n = Math.min(4, horiz ? Math.abs(bx - ax) : Math.abs(by - ay));
      const sx = horiz ? Math.sign(bx - ax) : 0, sy = horiz ? 0 : Math.sign(by - ay);
      for (let k = 0; k <= n; k++) out.push((ay + sy * k) * w + ax + sx * k);
      return out;
    }
    X.opMove = (t) => {
      if (!op) return;
      if (X.tool === 'demolish') { if (!op.seen.has(t)) { op.seen.add(t); act({ k: 'demolish', tile: t }); } return; }
      if (t === op.b && prev) return;
      op.b = t;
      if ((X.tool === 'rail' && X.sub === 'track') || X.tool === 'road') {
        if (t === op.a) { prev = null; TR.overlay([{ t, c: 'sel' }], 's' + t); return; }
        prev = E.preview(s, kindOf(), op.a, t);
        showPlan('p' + op.a + ':' + t);
      } else if (X.tool === 'stop' && X.sub === 'station') {
        op.line = line(op.a, t);
        TR.overlay(op.line.map((x) => ({ t: x, c: 'ok' })), 'l' + op.line.join());
      } else TR.overlay([{ t, c: 'sel' }], 's' + t);
    };
    X.opEnd = (t, moved) => {
      if (!op) return;
      const o = op; op = null;
      if (X.tool === 'demolish') { TR.overlay([], ''); return; }
      if ((X.tool === 'rail' && X.sub === 'track') || X.tool === 'road') {
        if (prev && prev.ok) { hud.hint(''); hud.confirm(prev, kindOf(), prev.why ? why(prev.why) : ''); return; }
        TR.overlay([], ''); hud.hint(moved ? (prev && prev.why ? why(prev.why) : L('ex_err_noroute')) : L(X.tool === 'rail' ? 'ex_h_rail' : 'ex_h_road'), 2600); prev = null;
        return;
      }
      TR.overlay([], '');
      if (t == null) return;
      if (X.tool === 'rail' && X.sub === 'signal') act({ k: 'signal', tile: t });
      else if (X.tool === 'rail' && X.sub === 'oneway') act({ k: 'oneway', tile: t });
      else if (X.tool === 'stop' && X.sub === 'station') act({ k: 'station', kind: 'rail', tiles: o.line || [t] });
      else if (X.tool === 'stop') act({ k: 'station', kind: 'road', tile: t });
    };
    X.opCancel = () => { op = null; cancelBuild(); };
    // anteprima: caselle (verdi; ponte e galleria in giallo), costo, tratti speciali e perché manca un salto dritto
    function showPlan(key) {
      const good = prev.ok && prev.afford, sp = new Set();
      if (prev.ok) for (const x of prev.spans || []) for (const t of x.tiles) sp.add(t);
      TR.overlay((prev.ok ? prev.tiles : [op ? op.a : prev.tiles[0], op ? op.b : prev.tiles[0]]).map((x) => ({ t: x, c: !good ? 'bad' : sp.has(x) ? 'sign' : 'ok', a: sp.has(x) ? 0.75 : undefined })), key + good + (prev.tn || []).length);
      const st = prev.ok ? hud.spanText(prev) : '';
      hud.hint(prev.ok ? `${L('ex_tiles', { n: prev.tiles.length })} · ${hud.nf(prev.cost)}${st ? ' · ' + st : ''}${prev.why ? ' · ' + why(prev.why) : ''}` : prev.why ? why(prev.why) : L('ex_err_noroute'), 0);
    }
    // la proposta alternativa (galleria ↔ sopra la collina, ponte ↔ giro lungo)
    X.swapPlan = () => {
      if (!prev || !prev.alt) return;
      const a = prev.alt; prev.alt = null; a.alt = prev; a.why = prev.why; prev = a;
      sfx('tap');
      showPlan('w' + prev.tiles.join());
      hud.hint('');
      hud.confirm(prev, kindOf(), prev.why ? why(prev.why) : '');
    };
    X.commitBuild = () => { if (prev && prev.ok) act({ k: 'build', kind: kindOf(), tiles: prev.tiles, tn: prev.tn }); cancelBuild(); };
    function cancelBuild() { prev = null; hud.hideConfirm(); TR.overlay([], ''); }
    X.cancelBuild = cancelBuild;
    X.hover = (p) => {
      if (op || prev || hud.isOpen() || !s) return;
      if (!p || X.tool === 'info') { TR.overlay([], ''); return; }
      TR.overlay([{ t: p.t, c: 'sel', a: 0.35 }], 'h' + p.t);
    };
    // tocco con Info (o mentre si scelgono le fermate di un nuovo mezzo): scheda di quello che c'è lì
    X.tap = (p) => {
      if (!s) return;
      const w = X.W, t = p.t;
      if (X.picking) {
        if (w.st[t] && hud.addOrder(w.st[t] - 1)) { sfx('blip'); hud.hint(L('ex_h_pick'), 0); TR.overlay([{ t, c: 'ok' }], 'k' + t); }
        else sfx('bad');
        return;
      }
      if (X.tool !== 'info') return;
      sfx('tap');
      // su una casella di stazione vince la stazione (i mezzi fermi lì sono nella sua lista "mezzi che si fermano qui")
      if (w.st[t]) { hud.station(w.st[t] - 1); return; }
      const v = VE.pick(p.x, p.z);
      if (v) { hud.vehicle(v.id); return; }
      if (w.use[t] === 1) { hud.town(w.own[t]); return; }
      if (w.use[t] === 2) { hud.industry(w.own[t]); return; }
      // vicino al centro di un villaggio (le sue strade)
      for (const tw of s.towns) if (Math.abs(tw.x + 0.5 - p.x) < 2.5 && Math.abs(tw.y + 0.5 - p.z) < 2.5) { hud.town(tw.id); return; }
      hud.close();
    };

    /* ---------- eventi della simulazione ---------- */
    let cashAt = 0, whistleAt = 0, first = true;
    function dispatch(ev) {
      const now = performance.now();
      for (const e of ev) {
        if (e.k === 'pay') {
          const st = s.stations[e.st];
          if (st) { const t = st.tiles[0]; hud.pop((t % X.W.w) + 0.5, ((t / X.W.w) | 0) + 0.5, e.money, IN.project); }
          if (now - cashAt > 700) { cashAt = now; sfx('cash'); }
          if (first && s.h > 0) { first = false; hud.say(L('ex_e_first', { n: hud.nf(e.money) }), 5000); }
        } else if (e.k === 'arrive') {
          const v = s.veh.find((x) => x.id === e.v);
          if (v && HH.expressSim.isTrain(v) && now - whistleAt > 4000) { whistleAt = now; sfx('whistle'); }
        } else if (e.k === 'grow') hud.say(L('ex_e_grow', { town: s.towns[e.town].name }), 5000);
        else if (e.k === 'sold') hud.say(L('ex_e_sold', { v: '#' + e.v }), 6000);
        else if (e.k === 'stuck') hud.coach(true);
        else if (e.k === 'hour') {
          dayN++;
          if (dayN % 10 === 0) ctx.changed();
          if (dayN % 2 === 0) hud.refresh();
          if (dayN % 6 === 0) hud.coach();
        } else if (e.k === 'win') {
          hud.say(L('ex_e_goal'), 6000); if (ctx.react) ctx.react('happy');
          ctx.changed();
          later(() => ctx.win(), 1600);
        } else if (e.k === 'lose') {
          hud.say(L('ex_e_late'), 6000);
          ctx.changed();
          later(() => (ctx.outOfMoves ? ctx.outOfMoves('stuck') : null), 1200);
        }
      }
    }

    /* ---------- misura, tema, scena ---------- */
    let Wd = 300, Hd = 400;
    function measure() {
      if (!X.R3) return;
      const r = X.ui.wrap.getBoundingClientRect();
      Wd = Math.max(1, Math.round(r.width)); Hd = Math.max(1, Math.round(r.height));
      X.land = Wd > Hd * 1.2 && Hd < 560;
      X.ui.wrap.classList.toggle('land', X.land);
      hud.fitTools();
      X.R3.renderer.setSize(Wd, Hd, false);
      IN.cam.size(Wd, Hd);
    }
    function rebuildAll() {
      D3.buildScene();
      TR.resetFx();
      D3.rebuildDyn(); TR.rebuildNet(); VE.build();
      IN.cam.apply();
    }

    /* ---------- ciclo ---------- */
    function loop(now) {
      if (!alive) return;
      if (!el.isConnected) { detach(); return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (now - themeAt > 1000) { themeAt = now; if (D3.readTheme()) rebuildAll(); }
      // pixel ratio che si adatta ai fotogrammi lenti
      if (dt > 0) {
        if (dt > 1 / 36) { slowF++; fastF = 0; } else if (dt < 1 / 55) { fastF++; slowF = Math.max(0, slowF - 1); }
        if (slowF > 45 && X.pr > 0.75) { X.pr = Math.max(0.75, X.pr - 0.25); X.R3.renderer.setPixelRatio(X.pr); measure(); slowF = 0; }
        else if (fastF > 400 && X.pr < Math.min(X.prMax(), G.devicePixelRatio || 1)) { X.pr = Math.min(X.prMax(), X.pr + 0.25); X.R3.renderer.setPixelRatio(X.pr); measure(); fastF = 0; }
      }
      const f0 = performance.now();
      if (!paused && s && s.speed && !E.isOver(s) && !qa.hold) {
        acc += dt * TPS * s.speed;
        const n = Math.min(40, Math.floor(acc));
        if (n > 0) { acc -= n; const ev = E.step(s, n); if (ev.length) dispatch(ev); }
        if (acc > 40) acc = 0;
      }
      if (s) {
        tod = SKY.hourOf(s.h, s.tk, E.TPH, !paused && s.speed && !E.isOver(s) ? Math.min(1, acc) : 0);
        if (s.speed) { const want = SKY.depth(s.speed); dep += (want - dep) * Math.min(1, dt * 1.5); }
      }
      IN.cam.step(dt);
      if (X.R3 && X.R3.scene) {
        D3.rebuildDyn(); TR.rebuildNet();
        // da lontano i contorni degli alberi sono più sottili di un pixel: si risparmiano
        const farOl = IN.cam.zoom > 12;
        if (farOl !== X.R3.farOl) { X.R3.farOl = farOl; for (const c of X.R3.dyn.children) if (c.userData.treeOl) c.visible = !farOl; }
        const LT = skyNow();
        D3.applySky(LT); TR.paintLamps(); hud.sky(LT);
        TR.paintSignals();
        if (X.R3.water) X.R3.water.uniforms.uT.value = reduce() ? 0 : now / 1000;
        VE.update(s.speed && !paused ? Math.min(1, acc) : 0, now / 1000);
        X.R3.renderer.render(X.R3.scene, X.R3.cam);
        const i = X.R3.renderer.info.render;
        perf.calls = i.calls; perf.tris = i.triangles;
        hud.labels(IN.project, IN.cam.zoom);
      }
      const fm = performance.now() - f0;
      perf.n++; perf.sum += fm; if (fm > perf.max) perf.max = fm;
      hud.hud();
      raf = paused ? 0 : requestAnimationFrame(loop);
    }
    function start() { if (!raf && alive) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function pause() { if (paused) return; paused = true; stop(); hud.hud(); if (s) ctx.changed(); }
    function resume() { if (!paused) return; paused = false; hud.hud(); start(); }
    function togglePause() { E.act(s, { k: 'speed', v: s.speed ? 0 : 1 }); hud.hud(); ctx.changed(); }

    function begin(state) {
      stop(); timers.forEach(clearTimeout); timers = [];
      s = state; acc = 0; dayN = 0; first = !Object.keys(s.del).length;
      tod = SKY.hourOf(s.h, s.tk, E.TPH, 0); dep = SKY.depth(s.speed || 1);
      op = null; prev = null; X.picking = false;
      hud.close(); hud.hideConfirm(); hud.hint('');
      if (!glOk) return;
      if (!D3.initGL()) { glOk = false; X.ui.wrap.insertAdjacentHTML('beforeend', `<div class="ex-veil">${L('ry_nogl')}</div>`); return; }
      X.themeKey = ''; D3.readTheme();
      rebuildAll(); measure();
      // camera sul primo villaggio e sul sito vicino
      const W = X.W, t0 = s.towns[0];
      IN.cam.zoom = Math.min(11, Math.max(6, W.w * 0.36));
      if (t0 && s.mode === 'level') {
        const other = s.inds[0] || s.towns[1] || t0;
        IN.cam.focus((t0.x + (other.x + (other.type ? 1 : 0.5))) / 2 + 0.25, (t0.y + (other.y + (other.type ? 1 : 0.5))) / 2 + 0.25);
      } else IN.cam.center();
      IN.cam.apply();
      themeAt = performance.now();
      hud.paintTools(); hud.hud();
      later(() => hud.coach(true), 900);
      paused = false;
      start();
    }
    function fresh() {
      const mode = slot() === 'express@free' ? 'free' : 'level';
      begin(mode === 'free' ? E.newFree(Object.assign({}, X.freeOpts(), { seed: Math.floor(Math.random() * 99999) + 1 })) : E.newLevel(ctx.level, Math.random));
      ctx.changed({ reset: true });
    }
    function restart() {
      if (!s) { fresh(); return; }
      begin(s.mode === 'free' ? E.newFree(Object.assign({ seed: s.seed }, s.opts)) : E.levelFromSeed(ctx.level, s.seed));
      ctx.changed({ reset: true });
    }

    /* ---------- pulizia ---------- */
    let ro = null;
    function onVis() { if (document.hidden) pause(); }
    function onResize() { measure(); }
    function detach() {
      if (!alive) return;
      alive = false; X.alive = false;
      stop(); timers.forEach(clearTimeout); timers = [];
      IN.detach();
      G.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      if (ro) { ro.disconnect(); ro = null; }
      if (X.R3) { D3.disposeScene(); try { X.R3.grad.dispose(); X.R3.renderer.dispose(); X.R3.renderer.forceContextLoss(); } catch (e) { /* già perso */ } X.R3 = null; }
    }
    if (el._exDetach) el._exDetach();
    el._exDetach = detach;
    IN.attach();
    G.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    if (G.ResizeObserver) { ro = new G.ResizeObserver(() => { if (alive) measure(); }); ro.observe(X.ui.wrap); }

    // QA (Playwright): stato, prestazioni, azioni dirette, camera
    const qa = { hold: false };
    el._express = {
      state: () => s, E, X,
      info: () => ({ calls: perf.calls, tris: perf.tris, pr: X.pr, frame: perf.n ? +(perf.sum / perf.n).toFixed(2) : 0, frameMax: +perf.max.toFixed(1), frames: perf.n, veh: s ? s.veh.length : 0, free: IN.cam.free }),
      perfReset: () => { perf.n = 0; perf.sum = 0; perf.max = 0; },
      freeze: (on) => { qa.hold = !!on; },
      screen: (x, z) => { const p = IN.project(x + 0.5, 0.02, z + 0.5); return { x: p.x + X.ui.wrap.getBoundingClientRect().left, y: p.y + X.ui.wrap.getBoundingClientRect().top }; },
      cam: IN.cam, step: (n) => dispatch(E.step(s, n)), start: (lv, seed) => begin(E.levelFromSeed(lv, seed)),
      sky: () => ({ t: tod, alwaysDay, dep, phase: SKY.phase(tod), clock: hud.fmtDate(s.h) }),
      // QA: fa passare il tempo fino all'ora hh (0–23), al più un giorno, senza disegnare nel frattempo
      until: (hh) => { let n = 0; while ((s.h % 24 !== hh || s.tk) && n++ < 24 * E.TPH) dispatch(E.step(s, 1)); acc = 0; return s.h; },
    };

    let restored = null;
    try { restored = saved && E.restore(saved); } catch (e) { restored = null; }
    if (restored) begin(restored);
    else {
      const wantFree = slot() === 'express@free';
      begin(wantFree ? E.newFree(Object.assign({ size: 32, water: 1, seed: Math.floor(Math.random() * 99999) + 1 }, X.freeOpts())) : E.newLevel(ctx.level, Math.random));
      // prima apertura di una partita nuova della campagna: scelta della modalità (Campagna, Libera, Mappe reali)
      if (!wantFree && ctx.level === 1 && !sget('express:seenHome', false)) { sset('express:seenHome', true); hud.home(true); }
    }

    return {
      fresh, restart,
      // in tempo reale non si torna indietro: "Annulla" mette in pausa / riprende la simulazione
      undo() { togglePause(); },
      pause, resume,
      destroy: detach,
      snapshot: () => s,
    };
  }

  HH.games.push({
    id: 'express', name: 'Hari Express', rules: 'r_express', rulesEn: A.RULES_EN,
    art: A.art, create, tutorial: A.TUT,
    fill: true,                 // gioco solo a schermo intero: la scena riempie il riquadro
    slot,
    rate: (s) => HH.express.rate(s),
    parTime: (s) => HH.express.parTime(s),
    solved: (s) => HH.express.isWon(s),
    progress: (s) => HH.express.progress(s),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
