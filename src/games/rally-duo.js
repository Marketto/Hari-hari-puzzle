/* Hari Rally — a due giocatori: menu, scelta del kart, schermo diviso, gara in rete locale (HH.mp + HH.rallyNet), fine gara a due.
 * Parte di rally-ui.js (stesso create()): si carica prima e rally-ui.js la monta con HH.rallyDuo(RX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // RX = contesto condiviso con rally-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.rallyDuo = function (RX) {
    const { ctx, el, o, L, DUO, PHONES, SPLIT, CHARS, kartBackW, fmtT, P, ptrs, clearKeys, later, sfx, face, isHum,
      split, eachView, setViews, splitOK, tag, paintProg, say, changed, renderMode, engine, finish, pause, resume,
      begin } = RX;
    // fine gara a due: classifica con i due giocatori, fragoline di ciascuno, vittoria di squadra se uno dei due è primo
    const BERRY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c5 0 8 2.6 8 6.4 0 4.4-4.6 8.6-8 8.6s-8-4.2-8-8.6C4 9.6 7 7 12 7Z" fill="var(--ry-straw)" ${o(1.4)}/><path d="M8 7.6c1-2.6 2.4-3.6 4-3.6s3 1 4 3.6c-1.4.8-2.6 1-4 1s-2.6-.2-4-1Z" fill="var(--ry-kleaf)" ${o(1.1)}/><circle cx="9" cy="12" r=".9" fill="var(--ry-seed)"/><circle cx="15" cy="12" r=".9" fill="var(--ry-seed)"/><circle cx="12" cy="15.6" r=".9" fill="var(--ry-seed)"/></svg>`;
    function finishMP() {
      RX.over = performance.now();
      engine(false);
      ptrs.clear(); clearKeys();
      eachView(() => { RX.fxoEl.className = 'ry-fxo'; });
      const hs = RX.s.hu || [0], duo = hs.length > 1;
      const berries = (id) => { const n = Math.max(0, 4 - (RX.s.res.findIndex((r) => r.id === id) + 1)); return `<b class="ry-berries" aria-label="${n}">${BERRY.repeat(n)}</b>`; };
      const rows = RX.s.res.map((r, i) => `<li class="${tag(r.id)}"><em>${i + 1}</em><i>${face(r.id, i === 0)}</i>${isHum(r.id) ? berries(r.id) : ''}<span>${fmtT(r.t)}</span></li>`).join('');
      const best = split() ? Math.min(...hs.map((id) => P.posOf(RX.s, id))) : P.posOf(RX.s, RX.ME);
      const btns = RX.s.won ? '' : RX.mpMode === 'guest' && RX.net
        ? `<small>${L('ry_mp_host')}</small><button class="candy ry-opt" type="button" data-mp="solo"><span>${L('ry_mp_solo')}</span></button>`
        : `<div class="ry-mpbtns"><button class="candy ry-retry" type="button"><span>${duo || RX.net ? L('ry_mp_again') : L('retry')}</span></button><button class="ry-opt" type="button" data-mp="solo"><span>${L('ry_mp_solo')}</span></button></div>`;
      RX.endEl.innerHTML = `<b class="ry-team ${RX.s.won ? 'win' : ''}">${L(RX.s.won ? 'ry_mp_win' : 'ry_mp_lose')}</b><span class="ry-big">${best}<small>/4</small></span><ol>${rows}</ol>${btns}`;
      later(() => { RX.endEl.hidden = false; }, 500);
      changed(true);
      if (RX.s.won) { sfx('cupDone'); if (ctx.react) ctx.react('happy'); later(() => ctx.win(), (el._rally && el._rally.winDelay) || 2600); }
      else { sfx('lose'); if (ctx.react) ctx.react('oops'); }
    }


    /* ---------- a due giocatori: schermo diviso e rete locale (HH.mp) ---------- */
    const rseed = () => Math.floor(Math.random() * 2147483647) >>> 0;
    let lastP2 = 'kitty';
    // il veil "gioca insieme": scelta tra rete e schermo diviso (quel che il dispositivo non può fare è spento)
    function mpMenu() {
      if (!RX.s) return;
      if (!RX.paused && !P.isOver(RX.s)) pause();
      // a due (schermo diviso o link vivo): solo "da solo" o annulla; l'host rimasto senza amico (link caduto, il suo
      // kart guida l'IA) può invece riabbinarsi o passare allo schermo diviso, e anche tornare alla sua gara
      if (RX.mpMode && (RX.mpMode === 'split' || RX.net)) { RX.mpEl.innerHTML = `<b>${L('ry_mp')}</b><div class="ry-mpbtns"><button class="ry-opt" type="button" data-mp="solo">${DUO}<span>${L('ry_mp_solo')}</span></button><button class="ry-opt" type="button" data-mp="cancel"><span>${L('lf_cancel')}</span></button></div>`; RX.mpEl.hidden = false; return; }
      const canNet = !!(HH.mp && HH.mp.pair && HH.rallyNet), canSplit = splitOK();
      RX.mpEl.innerHTML = `<b>${L('ry_mp')}</b>
        <div class="ry-mpbtns">
          <button class="ry-opt" type="button" data-mp="net"${canNet ? '' : ' disabled'}>${PHONES}<span>${L('ry_mp_net')}</span></button>
          <button class="ry-opt" type="button" data-mp="split"${canSplit ? '' : ' disabled'}>${SPLIT}<span>${L('ry_mp_split')}</span></button>
          ${RX.mpMode ? `<button class="ry-opt" type="button" data-mp="solo">${DUO}<span>${L('ry_mp_solo')}</span></button>` : ''}
        </div>
        ${canNet ? '' : `<small>${L('ry_mp_nonet')}</small>`}${canSplit ? '' : `<small>${L('ry_mp_nosplit')}</small>`}
        <small class="ry-rule">${L('ry_mp_rule')}</small>
        <button class="ry-opt" type="button" data-mp="cancel"><span>${L('lf_cancel')}</span></button>`;
      RX.mpEl.hidden = false;
      const first = RX.mpEl.querySelector('button:not([disabled])');
      if (first) first.focus();
    }
    let pickCb = null;
    // scelta del kart del giocatore 2 (la Micia sul kart-mela, o uno dei tre animaletti che allora non corre contro)
    function mpPick(cb, title) {
      pickCb = cb;
      RX.mpEl.innerHTML = `<b>${title || L('ry_mp_pick')}</b><div class="ry-picks">${CHARS.slice(1).reverse().map((w) => `<button class="ry-pick" type="button" data-mp="pick:${w}" aria-label="${L('ry_who_' + w)}"><svg viewBox="-20 -28 40 42" aria-hidden="true">${kartBackW(0, 0, 1, w)}</svg><span>${L('ry_who_' + w)}</span></button>`).join('')}</div>
        <button class="ry-opt" type="button" data-mp="cancel"><span>${L('lf_cancel')}</span></button>`;
      RX.mpEl.hidden = false;
      const first = RX.mpEl.querySelector('.ry-pick');
      if (first) first.focus();
    }
    function mpWait(text) {
      RX.mpEl.innerHTML = `<b class="ry-waitb">${text}</b><span class="ry-dots" aria-hidden="true"><i></i><i></i><i></i></span><button class="ry-opt" type="button" data-mp="cancel"><span>${L('lf_cancel')}</span></button>`;
      RX.mpEl.hidden = false;
    }
    function mpClick(k) {
      sfx('tap');
      if (k === 'cancel') {
        // annullato mentre si aspetta l'amico: si chiude il collegamento e si torna alla gara da soli
        if (RX.net && (!RX.s || !RX.s.hu)) { endMP(); return; }
        RX.mpEl.hidden = true; return;
      }
      if (k === 'split') { mpPick((w) => startSplit(w), `${L('ry_mp_p2')}: ${L('ry_mp_pick')}`); return; }
      if (k === 'net') { startNet(); return; }
      if (k === 'solo') { endMP(); return; }
      if (k.startsWith('pick:')) { const w = k.slice(5), cb = pickCb; pickCb = null; if (cb && CHARS.indexOf(w) > 0) cb(w); }
    }
    function startSplit(p2) {
      if (!RX.mpMode) RX.solo = RX.s;
      if (RX.net) { RX.net.close(); RX.net = null; }
      RX.mpMode = 'split'; RX.ME = 0; lastP2 = p2;
      RX.mpEl.hidden = true;
      setViews(2);
      begin(P.newLevel(ctx.level, null, { humans: 2, p2, seed: rseed() }));
      ctx.changed({ reset: true });
    }
    function startNet() {
      if (RX.mpBusy || !HH.mp || !HH.rallyNet) return;
      RX.mpBusy = true;
      RX.mpEl.hidden = true;
      Promise.resolve(HH.mp.pair({ game: 'rally', players: 2, title: 'Hari Rally' })).then((link) => {
        RX.mpBusy = false;
        if (!RX.alive) { if (link) link.close(); return; }
        if (!link) { mpMenu(); return; }
        if (!RX.mpMode) RX.solo = RX.s;
        if (link.role === 'host') {
          RX.net = HH.rallyNet.host(link, { onMsg: hostMsg, onDrop: netDrop });
          RX.mpMode = 'host'; RX.ME = 0;
          RX.net.start();
          mpWait(L('ry_mp_wait'));
        } else {
          RX.net = HH.rallyNet.guest(link, { onMsg: guestMsg, onDrop: netDrop });
          RX.mpMode = 'guest'; RX.ME = 1;
          RX.net.start();
          mpPick((w) => { lastP2 = w; RX.net.send({ ry: 'hello', p2: w }); mpWait(L('ry_mp_host')); });
        }
        renderMode();
      }).catch(() => { RX.mpBusy = false; mpMenu(); });
    }
    // host: arriva la scelta dell'ospite → si genera la gara e si manda solo il seme
    function hostRace(level) {
      const seed = rseed(), st = P.newLevel(level, null, { humans: 2, p2: lastP2, seed });
      st.me = 0;
      RX.net.send({ ry: 'start', level, seed, p2: lastP2 });
      RX.net.race(st);
      RX.mpEl.hidden = true;
      begin(st);
      ctx.changed({ reset: true });
    }
    function hostMsg(m) {
      if (m.ry === 'hello') { lastP2 = CHARS.indexOf(m.p2) > 0 ? m.p2 : 'kitty'; hostRace(ctx.level); }
      else if (m.ry === 'pause') pause(true);
      else if (m.ry === 'resume') resume(true);
      else if (m.ry === 'quit') netDrop('quit');
    }
    function guestMsg(m) {
      if (m.ry === 'start') {
        const st = P.newLevel(m.level, null, { humans: 2, p2: m.p2, seed: m.seed });
        RX.ME = 1; RX.net.race(st);
        RX.mpEl.hidden = true;
        begin(st);
        ctx.changed({ reset: true });
      } else if (m.ry === 'pause') pause(true);
      else if (m.ry === 'resume') resume(true);
      else if (m.ry === 'fin') { if (RX.s && RX.s.hu && !RX.endEl.innerHTML) finish(); }
      else if (m.ry === 'quit') netDrop('quit');
    }
    // il collegamento è caduto (o l'altro è uscito): l'host continua (il kart dell'ospite ora è dell'IA), l'ospite
    // torna alla sua gara da solo
    function netDrop(why) {
      const was = RX.mpMode;
      if (el._rally) el._rally.lastDrop = String(why || '');   // QA: motivo dell'ultima chiusura
      RX.net = null;
      if (!RX.alive) return;
      if (was === 'host' && RX.s && RX.s.hu && !P.isOver(RX.s)) { say(L('ry_mp_left'), 'small', 2600); paintProg(); RX.lastHud.rank = ''; return; }
      if (was === 'guest' && RX.s && RX.s.hu && P.isOver(RX.s)) return;
      endMP();
      if (was) later(() => say(L(was === 'host' ? 'ry_mp_left' : 'ry_mp_lost'), 'small', 2600), 300);
    }
    // prossima gara a due (rivincita, o il livello dopo una vittoria)
    function mpNext(level) {
      if (RX.mpMode === 'split') { begin(P.newLevel(level, null, { humans: 2, p2: lastP2, seed: rseed() })); ctx.changed({ reset: true }); return; }
      if (RX.mpMode === 'host' && RX.net) { hostRace(level); return; }
      if (RX.mpMode === 'guest' && RX.net) {
        // l'host ha già fatto partire la gara successiva (il suo "start" chiude anche il riquadro della vittoria)
        if (RX.s && RX.s.hu && !P.isOver(RX.s)) return;
        RX.endEl.hidden = true; mpWait(L('ry_mp_host')); return;
      }
      endMP(true);
    }
    // si torna a giocare da soli: la gara in singolo messa da parte (in pausa) o una nuova
    function endMP(fresh1) {
      if (RX.net) { try { RX.net.send({ ry: 'quit' }); } catch (e) { /* già chiuso */ } const n = RX.net; RX.net = null; later(() => n.close(), 200); }
      const back = RX.solo;
      RX.solo = null; RX.mpMode = ''; RX.ME = 0; pickCb = null;
      RX.mpEl.hidden = true;
      setViews(1);
      if (back && !P.isOver(back) && !fresh1) begin(back, true);
      else begin(P.newLevel(ctx.level, Math.random));
      ctx.changed({ reset: true });
    }

    return { finishMP, mpMenu, mpClick, startSplit, mpNext, endMP };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
