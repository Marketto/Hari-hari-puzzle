/* Hari Fishing — DOM del gioco (scena, indicatore della lenza, pulsanti), messaggi e indicatori.
 * Parte di fish-ui.js (stesso create()): si carica prima e fish-ui.js la monta con HH.fishHud(FX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // FX = contesto condiviso con fish-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.fishHud = function (FX) {
    const { el, L, BOOK, PAUSE, SNAPI, LOOSEI, DOWN, TILT, LEFTI, RIGHTI, PHONE, CASTI, PLAY, HAND, FISHI, TICK,
      spName, fishArt, f1, coarse, clamp, P, sset, sfx, sensor, hold, drag, sensorLive, mode, needPerm, askMotion,
      castLabel, onHoldStart, onHoldEnd, chargeP, onDown, onMove, onUp, setPower, face, measure, openAlbum, checkTurn,
      resume } = FX;
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
      FX.wrap = q('.fi-wrap'); FX.stage = q('.fi-stage'); FX.cv = q('.fi-cv'); FX.gaugeEl = q('.fi-gauge'); FX.markEl = q('.fi-mark'); FX.okEl = q('.fi-okz'); FX.hotEl = q('.fi-hotz');
      FX.brkEl = q('.fi-warn i.brk'); FX.slkEl = q('.fi-warn i.slk'); FX.distEl = q('.fi-dist'); FX.goalEl = q('.fi-goal'); FX.msgEl = q('.fi-msg b'); FX.hintEl = q('.fi-hint');
      FX.pullBtn = q('.fi-hold.pull'); FX.slackBtn = q('.fi-hold.slack'); FX.tiltEl = q('.fi-tiltm'); FX.phoneEl = q('.fi-phone'); FX.motionBtn = q('.fi-motion'); FX.modeBtn = q('.fi-mode');
      FX.pauseBtn = q('.fi-pbtn'); FX.albumBtn = q('.fi-albumb'); FX.pauseEl = q('.fi-pause'); FX.turnEl = q('.fi-turn'); FX.caughtEl = q('.fi-caught'); FX.albumEl = q('.fi-album');
      FX.powerEl = q('.fi-power'); FX.heartsEl = q('.fi-hearts'); FX.flashEl = q('.fi-flash'); FX.tagsEl = q('.fi-tgs'); FX.diveEl = q('.fi-dive'); FX.faceEl = q('.fi-face');
      FX.leftBtn = q('.fi-hold.lr.l'); FX.rightBtn = q('.fi-hold.lr.r');
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
      holdOn(FX.pullBtn, 'pull'); holdOn(FX.slackBtn, 'slack'); holdOn(FX.leftBtn, 'left'); holdOn(FX.rightBtn, 'right');
      FX.motionBtn.onclick = () => { sfx('tap'); askMotion(); };
      FX.modeBtn.onclick = () => { sfx('tap'); if (FX.pref === 'tilt') { FX.pref = 'buttons'; } else { FX.pref = 'tilt'; if (!sensorLive() || needPerm()) { askMotion(); return; } sensor.zero = sensor.pitch; } sset('fish:ctl', FX.pref); renderMode(); };
      FX.pauseBtn.onclick = () => { sfx('tap'); FX.toggle(); };
      FX.albumBtn.onclick = () => { sfx('tap'); openAlbum(); };
      FX.pauseEl.onclick = () => resume();
      FX.stage.addEventListener('pointerdown', onDown);
      FX.stage.addEventListener('pointermove', onMove);
      ['pointerup', 'pointercancel'].forEach((ev) => FX.stage.addEventListener(ev, onUp));
      if (G.ResizeObserver) { if (el._fiRO) el._fiRO.disconnect(); el._fiRO = new G.ResizeObserver(() => measure()); el._fiRO.observe(FX.stage); }
    }
    const caughtOpen = () => FX.caughtEl && !FX.caughtEl.hidden;
    const albumOpen = () => FX.albumEl && !FX.albumEl.hidden;
    function renderMode() {
      if (!FX.wrap) return;
      const m = mode();
      FX.wrap.classList.toggle('tilt', m === 'tilt');
      FX.modeBtn.innerHTML = m === 'tilt' ? TILT : HAND;
      const lab = m === 'tilt' ? L('fi_tilt') : L('fi_buttons');
      FX.modeBtn.setAttribute('aria-label', lab); FX.modeBtn.title = lab;
      // il pulsante dei sensori appare solo sui telefoni: serve il permesso (iOS) o i sensori non sono ancora attivi
      const touch = coarse();
      FX.modeBtn.hidden = !touch && !sensorLive();
      FX.motionBtn.hidden = !(touch && m !== 'tilt' && FX.pref === 'tilt' && (needPerm() || !sensorLive()) && !sensor.asked) || (FX.s && FX.s.phase !== 'aim');
      checkTurn();
    }

    /* ---------- messaggi ---------- */

    function say(text, cls = '') {
      if (!FX.msgEl) return;
      FX.msgEl.className = ''; void FX.msgEl.offsetWidth;
      FX.msgEl.textContent = text; FX.msgEl.className = `go ${cls}`;
      clearTimeout(FX.msgT); FX.msgT = setTimeout(() => { if (FX.msgEl) FX.msgEl.className = ''; }, 2000);
    }
    let hintKey = '';
    function hint(text) { if (FX.hintEl && hintKey !== text) { hintKey = text; FX.hintEl.textContent = text; } }
    function paintGoal(pop) {
      if (!FX.goalEl || !FX.s) return;
      const n = Math.min(FX.s.caught.length, FX.cfg.goal), done = n >= FX.cfg.goal;
      const tg = FX.cfg.target, got = tg && FX.s.caught.some((f) => f.sp === tg);
      FX.goalEl.innerHTML = `<span class="fi-chip${done ? ' done' : ''}${pop === 'n' ? ' pop' : ''}" aria-label="${L('fi_goal').replace('{n}', FX.cfg.goal)}">${FISHI}<b>${n}/${FX.cfg.goal}</b>${done ? TICK : ''}</span>`
        + (tg ? `<span class="fi-chip${got ? ' done' : ''}${pop === 't' ? ' pop' : ''}" aria-label="${L('fi_target').replace('{sp}', spName(tg))}" title="${L('fi_target').replace('{sp}', spName(tg))}"><svg viewBox="0 0 120 80" aria-hidden="true">${fishArt(tg, 62, 42, 1.25)}</svg>${got ? TICK : '<b>?</b>'}</span>` : '');
    }


    /* ---------- indicatori ---------- */

    function hud() {
      if (!FX.s || !FX.gaugeEl) return;
      const ph = FX.s.phase, fight = ph === 'fight';
      if (FX.wrap.dataset.phase !== ph) FX.wrap.dataset.phase = ph;
      FX.gaugeEl.classList.toggle('off', !fight);
      const z = P.zones(FX.s);
      const key = `${z.tMin}|${z.tMax}`;
      if (key !== FX.hudKey) {
        FX.hudKey = key;
        const top = (v) => `${f1((1 - v / 1.2) * 100)}%`;
        FX.okEl.style.top = top(z.tMax); FX.okEl.style.bottom = `${f1((z.tMin / 1.2) * 100)}%`;
        FX.hotEl.style.height = top(z.tMax);
      }
      const Tv = fight ? FX.s.T : 0;
      FX.markEl.style.top = `${f1((1 - clamp(Tv, 0, 1.2) / 1.2) * 100)}%`;
      FX.gaugeEl.setAttribute('aria-valuenow', String(Math.round(Tv * 100)));
      FX.brkEl.style.width = `${f1(FX.s.brk * 100)}%`; FX.slkEl.style.width = `${f1(FX.s.slk * 100)}%`;
      FX.gaugeEl.classList.toggle('danger', fight && FX.s.T > z.tMax);
      FX.gaugeEl.classList.toggle('loose', fight && FX.s.T < z.tMin);
      FX.distEl.textContent = `${Math.max(0, Math.round(FX.s.d))} m`;
      castLabel(ph === 'aim');
      FX.pullBtn.classList.toggle('call', ph === 'bite');
      if (FX.phoneEl) FX.phoneEl.style.transform = `rotate(${f1(-clamp(sensor.pitch - sensor.zero, -40, 40))}deg)`;
      // suggerimento della fase
      const tilt = mode() === 'tilt';
      let h = '';
      if (ph === 'aim') { h = tilt ? L('fi_cast_tilt') : L('fi_cast_drag'); if (hold.charge >= 0 || drag.id !== null) h = ''; }
      else if (ph === 'wait') h = tilt && sensor.calib > performance.now() ? L('fi_calib') : FX.s.pt < 7 || performance.now() - FX.scareAt < 3000 ? L('fi_lure') : '';
      else if (ph === 'fight') h = FX.s.pt < 4 ? L('fi_fight') : '';
      hint(h);
      if (hold.charge >= 0) { FX.powerEl.hidden = false; setPower(chargeP()); }
      if (FX.motionBtn) FX.motionBtn.hidden = FX.motionBtn.hidden || ph !== 'aim';
    }

    return { build, caughtOpen, albumOpen, renderMode, say, hint, paintGoal, hud };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
