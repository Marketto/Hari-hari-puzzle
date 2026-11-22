/* Hari Rally — DOM del gioco (scena, indicatori e comandi di ogni vista) e indicatori HTML (posizione, tempo, note, power-up, semaforo).
 * Parte di rally-ui.js (stesso create()): si carica prima e rally-ui.js la monta con HH.rallyHud(RX).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // RX = contesto condiviso con rally-ui.js (nomi stabili + getter/setter dello stato che cambia)
  HH.rallyHud = function (RX) {
    const { el, L, PLAY, AUTO, DUO, PHONE, o, DASH, CCOL, FLAG, PAUSE, ACORN, ZONE, PEDAL, GAS, puSvg, PU_LIST, BIG,
      arrow, ic, reduce, fmtT, P, later, face, colOf, isHum, posMe, eachView, measure, renderMode } = RX;
    /* ---------- costruzione del DOM ---------- */
    function build() {
      el.innerHTML = `<div class="ry-wrap" dir="ltr">
        <div class="ry-stage" tabindex="0" role="application" aria-label="${L('ry_board')}">
          <canvas class="ry-cv"></canvas>
          ${hudHTML(0)}
          <div class="ry-veil ry-pause" hidden><span class="ry-play">${PLAY}</span><b>${L('pa_paused')}</b><small>${L('pa_tap')}</small>
            <div class="ry-opts">
              <button class="ry-opt" type="button" data-opt="cam"></button>
              <button class="ry-opt" type="button" data-opt="auto">${AUTO}<span>${L('ry_auto')}</span><i class="ry-sw" aria-hidden="true"></i></button>
              <button class="ry-opt" type="button" data-opt="ctl"></button>
              <button class="ry-opt ry-mpopt" type="button" data-opt="mp">${DUO}<span>${L('ry_mp')}</span></button>
            </div></div>
          <div class="ry-veil ry-turn" hidden>${PHONE}<b>${L('ry_turn')}</b></div>
          <div class="ry-veil ry-end" hidden></div>
          <div class="ry-veil ry-mpv" hidden></div>
        </div></div>`;
      RX.wrap = el.querySelector('.ry-wrap');
      RX.stage = el.querySelector('.ry-stage');
      RX.cv = el.querySelector('.ry-cv');
      RX.pauseEl = el.querySelector('.ry-pause');
      RX.endEl = el.querySelector('.ry-end');
      RX.turnEl = el.querySelector('.ry-turn');
      RX.optsEl = el.querySelector('.ry-opts');
      RX.mpEl = el.querySelector('.ry-mpv');
      hudEls(el.querySelector('.ry-v'));
      renderMode();
      if (G.ResizeObserver) {
        if (el._ryRO) el._ryRO.disconnect();
        el._ryRO = new G.ResizeObserver(() => measure());
        el._ryRO.observe(RX.stage);
      }
    }
    // indicatori e comandi di una vista (sullo schermo diviso ce ne sono due, ognuno nella sua metà)
    function hudHTML(vi) {
      const GAUGE = `<svg viewBox="-24 -24 48 48" aria-hidden="true"><circle r="21" fill="var(--ry-gauge)" ${o(2.4)}/><path d="M-14 6A15 15 0 1 1 14 6" fill="none" stroke="var(--ry-dash-2)" stroke-width="3" stroke-dasharray="2 4"/><g class="ry-needle2"><path d="M0 0L-12 -6" stroke="var(--ry-needle)" stroke-width="3.4" stroke-linecap="round"/></g><circle r="3.6" fill="var(--ry-ink)"/></svg>`;
      return `<div class="ry-v" data-v="${vi}">
          <div class="ry-fxo" aria-hidden="true"></div>
          <div class="ry-dash">${DASH}</div>
          <div class="ry-prog" aria-hidden="true">${[3, 2, 1, 0].map((i) => `<i class="${i ? '' : 'me'}" data-id="${i}" style="--ry-c:${CCOL[i]}"></i>`).join('')}<b>${FLAG}</b></div>
          <div class="ry-top">
            <div class="ry-left"><div class="ry-pos" role="status"><b>4</b><small>/4</small></div><div class="ry-rank" aria-hidden="true"></div></div>
            <div class="ry-notes" aria-live="polite"></div>
            <div class="ry-right"><div class="ry-btns">
              <button class="ry-btn ry-mpbtn" type="button" aria-label="${L('ry_mp')}" title="${L('ry_mp')}">${DUO}</button>
              <button class="ry-btn ry-cam" type="button"></button>
              <button class="ry-btn ry-mode" type="button"></button>
              <button class="ry-btn ry-pbtn" type="button" aria-label="${L('pa_pause')}">${PAUSE}</button></div>
              <div class="ry-time">0:00.0</div>
              <div class="ry-acorn" role="img" aria-label="${L('ry_acorns')}: 0">${ACORN}<b>0</b></div></div>
          </div>
          <div class="ry-spd" aria-hidden="true">${GAUGE}</div>
          <div class="ry-ctl">
            <div class="ry-arr l" role="img" aria-label="${L('pa_left')}">${ZONE(-1)}</div>
            <div class="ry-arr r" role="img" aria-label="${L('pa_right')}">${ZONE(1)}</div>
            <div class="ry-ped brake" role="img" aria-label="${L('ry_brake')}">${PEDAL}</div>
            <div class="ry-ped gas" role="img" aria-label="${L('ry_gas')}">${GAS}<span class="ry-auto">${AUTO}</span></div>
          </div>
          <button class="ry-item empty" type="button" aria-label="${L('ry_item')}">${puSvg('gift')}</button>
          <div class="ry-msg" aria-live="polite"></div>
        </div>`;
    }
    function hudEls(v) {
      const q = (sel) => v.querySelector(sel);
      RX.needle = q('.ry-needle'); RX.wheelG = q('.ry-wheelg'); RX.posEl = q('.ry-pos'); RX.rankEl = q('.ry-rank'); RX.timeEl = q('.ry-time');
      RX.notesEl = q('.ry-notes'); RX.progEl = q('.ry-prog'); RX.msgEl = q('.ry-msg'); RX.pedalEl = q('.ry-ped.brake'); RX.gasEl = q('.ry-ped.gas');
      RX.arrL = q('.ry-arr.l'); RX.arrR = q('.ry-arr.r'); RX.modeBtn = q('.ry-mode'); RX.camBtn = q('.ry-cam'); RX.pauseBtn = q('.ry-pbtn');
      RX.itemBtn = q('.ry-item'); RX.acornEl = q('.ry-acorn'); RX.fxoEl = q('.ry-fxo'); RX.spdEl = q('.ry-needle2');
    }

    /* ---------- indicatori HTML ---------- */
    function hud() { if (RX.s) eachView(() => hudView()); }
    // classe del kart negli indicatori: me = chi guarda, mate = l'altro giocatore umano
    const tag = (id) => (id === RX.ME ? 'me' : isHum(id) ? 'mate' : '');
    function paintProg() {
      if (!RX.s) return;
      eachView(() => { RX.progEl.querySelectorAll('i').forEach((it) => { const id = +it.dataset.id; it.className = tag(id); it.style.setProperty('--ry-c', colOf(id)); }); });
    }
    function hudView() {
      const p = RX.s.cars[RX.ME], pos = posMe();
      if (pos !== RX.lastHud.pos) {
        const up = RX.lastHud.pos && pos < RX.lastHud.pos;
        RX.lastHud.pos = pos;
        RX.posEl.querySelector('b').textContent = String(pos);
        RX.posEl.setAttribute('aria-label', `${pos}/4`);
        if (up) { RX.posEl.classList.remove('up'); void RX.posEl.offsetWidth; RX.posEl.classList.add('up'); }
      }
      const rk = RX.s.rank.join('');
      if (rk !== RX.lastHud.rank) {
        RX.lastHud.rank = rk;
        RX.rankEl.innerHTML = RX.s.rank.map((id) => `<i class="${tag(id)}" style="--ry-c:${colOf(id)}">${face(id, false)}</i>`).join('');
      }
      const tt = Math.floor(Math.max(0, RX.s.t) * 10);
      if (tt !== RX.lastHud.t) { RX.lastHud.t = tt; RX.timeEl.textContent = fmtT(tt / 10); }
      // barra della tappa
      RX.progEl.querySelectorAll('i').forEach((it) => { const c = RX.s.cars[+it.dataset.id]; it.style.left = `${Math.max(0, Math.min(100, ((c.s - P.PREROLL) / RX.s.L) * 100)).toFixed(1)}%`; });
      // note
      const up = P.upcoming(RX.s, 2, RX.ME);
      const key = up.map((n) => n.i).join(',');
      if (key !== RX.lastHud.notes) {
        RX.lastHud.notes = key;
        RX.notesEl.innerHTML = up.map((n, j) => noteHTML(n, j)).join('');
      }
      RX.notesEl.querySelectorAll('.ry-dist i').forEach((bar, j) => { const n = up[j]; if (n) bar.style.width = `${Math.max(0, Math.min(100, (n.dist / P.CALL) * 100)).toFixed(0)}%`; });
      // power-up tenuto (con la "ruota" che gira appena presa la scatola) e ghiande
      const rolling = performance.now() < RX.rollUntil;
      const itKey = rolling ? -2 : p.it;
      if (itKey !== RX.lastHud.it) {
        RX.lastHud.it = itKey;
        const name = P.ITEMS[p.it];
        RX.itemBtn.classList.toggle('roll', rolling);
        RX.itemBtn.classList.toggle('empty', !rolling && !p.it);
        RX.itemBtn.classList.toggle('full', !rolling && !!p.it);
        if (!rolling) {
          RX.itemBtn.innerHTML = puSvg(name || 'gift');
          RX.itemBtn.setAttribute('aria-label', name ? `${L('ry_item')}: ${L('ry_pu_' + name).replace(/[!！¡]/g, '')}` : L('ry_item'));
        }
      }
      if (rolling) { const k = Math.floor(performance.now() / 90) % PU_LIST.length; if (RX.itemBtn.dataset.k !== String(k)) { RX.itemBtn.dataset.k = String(k); RX.itemBtn.innerHTML = puSvg(PU_LIST[k]); } }
      if (p.ac !== RX.lastHud.ac) {
        const more = RX.lastHud.ac >= 0 && p.ac > RX.lastHud.ac;
        RX.lastHud.ac = p.ac;
        RX.acornEl.querySelector('b').textContent = String(p.ac);
        RX.acornEl.setAttribute('aria-label', `${L('ry_acorns')}: ${p.ac}`);
        RX.acornEl.classList.toggle('max', p.ac >= P.PU.acornMax);
        if (more && !reduce()) { RX.acornEl.classList.remove('pop'); void RX.acornEl.offsetWidth; RX.acornEl.classList.add('pop'); }
      }
      // effetti a schermo: miele, petali, bolla, turbo
      const fxk = p.honey ? 'honey' : p.slow > 0 ? 'petals' : p.sh > 0 ? 'bubble' : p.boost > 0 ? 'zoom' : '';
      if (fxk !== RX.lastHud.fx) { RX.lastHud.fx = fxk; RX.fxoEl.className = `ry-fxo${fxk ? ' ' + fxk : ''}`; }
      // volante e lancette (cruscotto in visuale pilota, contachilometri tondo da dietro)
      const ang = RX.steerV * 70, nd = `rotate(${(-20 + Math.min(1.35, Math.abs(p.v) / RX.cfg.vmax) * 200).toFixed(0)})`;
      if (RX.wheelG) RX.wheelG.style.transform = `rotate(${ang.toFixed(1)}deg)`;
      if (RX.needle) RX.needle.setAttribute('transform', nd);
      if (RX.spdEl) RX.spdEl.setAttribute('transform', nd);
      RX.arrL.classList.toggle('on', RX.steerV < -0.2);
      RX.arrR.classList.toggle('on', RX.steerV > 0.2);
      RX.pedalEl.classList.toggle('on', RX.brakeOn);
      RX.gasEl.classList.toggle('on', RX.gasOn);
    }
    function noteHTML(n, j) {
      if (n.kind !== 'curve') return `<div class="ry-note${j ? ' next' : ''}"><svg viewBox="0 0 60 48" aria-hidden="true">${BIG[n.kind]}</svg><span class="ry-dist"><i></i></span></div>`;
      const mods = [n.caution && 'warn', n.nocut && 'nocut', n.bank && 'bank', n.long && 'long', n.into && 'into'].filter(Boolean).slice(0, 3);
      return `<div class="ry-note ${n.dir > 0 ? 'l' : 'r'}${n.caution ? ' warn' : ''}${j ? ' next' : ''}" role="img" aria-label="${n.dir > 0 ? '←' : '→'} ${n.g}">
        <svg viewBox="0 0 60 48" aria-hidden="true">${arrow(n.dir, n.g)}</svg><b class="ry-g">${n.hairpin ? 'U' : n.g}</b>
        <span class="ry-mods">${mods.map(ic).join('')}</span><span class="ry-dist"><i></i></span></div>`;
    }
    function say(html, cls = '', ms = 900) {
      RX.msgEl.innerHTML = `<b class="${cls}">${html}</b>`;
      RX.msgEl.classList.remove('show'); void RX.msgEl.offsetWidth; RX.msgEl.classList.add('show');
      later(() => { if (RX.msgEl.firstChild && RX.msgEl.firstChild.innerHTML === html) RX.msgEl.classList.remove('show'); }, ms);
    }
    function lights(n) {
      // semaforo di partenza: n rossi accesi (1–3), 0 = verde
      RX.msgEl.classList.remove('show');
      RX.msgEl.innerHTML = `<div class="ry-lights" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${n === 0 ? 'g' : i < n ? 'r' : ''}"></i>`).join('')}</div>`;
    }

    return { build, hudHTML, hudEls, hud, tag, paintProg, say, lights };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
