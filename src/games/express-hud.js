/* Hari Express — interfaccia DOM sopra la scena: barra in alto (ghiande, data, velocità), scheda obiettivo, colonna
 * di destra (ruota, vista libera, conti, zoom, modalità), fumetto di Hari, barra degli strumenti con le scelte
 * secondarie, anteprima del costo, schede a foglio dal basso (stazione, mezzo, nuovo mezzo e percorso, villaggio,
 * industria, conti e obiettivi), scelta della modalità (Campagna, Libera, Mappe reali) ed etichette sulla mappa.
 * Tutti i testi passano da L() (HH.i18n.t con l'inglese di riserva). Montato da express-ui.js: HH.expressHud(X).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  HH.expressHud = function (X) {
    const A = HH.expressArt, E = HH.express, S = HH.expressSim, NET = HH.expressNet;
    const { L, IC, cargoIc, vehIc, indIc, acorn } = A;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const code = () => (HH.i18n && HH.i18n.code) || 'en';
    const nf = (n) => { try { return new Intl.NumberFormat(code()).format(Math.round(n)); } catch (e) { return String(Math.round(n)); } };
    const pct = (r) => Math.round((r || 0) * 100) + '%';
    function fmtDate(day) {
      const d = E.date(day);
      let md;
      try { md = new Intl.DateTimeFormat(code(), { day: 'numeric', month: 'short' }).format(new Date(2001, d.m, d.d)); } catch (e) { md = d.d + '/' + (d.m + 1); }
      return md + ' · ' + L('ex_year', { n: d.y });
    }
    const cargoName = (c) => L('ex_k_' + c);
    const indName = (t) => L('ex_i_' + t);
    const stName = (st) => (st ? E.stationName(X.s, st, indName) : '?');
    const vName = (v) => (v.type === 'castagna' ? 'Castagna' : v.type === 'fragola' ? 'Fragola' : L('ex_v_' + v.type)) + ' ' + v.n;
    const TOOLS = [['rail', 'ex_t_rail'], ['road', 'ex_t_road'], ['stop', 'ex_t_stop'], ['water', 'ex_t_water', 1], ['air', 'ex_t_air', 1], ['demolish', 'ex_t_demolish'], ['info', 'ex_t_info']];
    const SUBS = { rail: [['track', 'ex_s_track', IC.rail], ['signal', 'ex_s_signal', IC.signal], ['oneway', 'ex_s_oneway', IC.oneway]],
      stop: [['station', 'ex_s_station', IC.station], ['busstop', 'ex_s_busstop', IC.stop]] };

    /* ---------- struttura ---------- */
    function build() {
      const el = X.el;
      el.innerHTML = `<div class="ex-wrap" role="application" aria-label="${esc(L('ex_board'))}">
        <canvas class="ex-cv" tabindex="0" aria-label="${esc(L('ex_board'))}"></canvas>
        <div class="ex-layer ex-labels" aria-hidden="true"></div>
        <div class="ex-top"><button class="ex-money" type="button" aria-label="${esc(L('ex_accounts'))}"><b>${acorn}<i class="mv">0</i></b><span class="dt"></span></button>
          <button class="ex-btn ex-sky" type="button" aria-pressed="false" aria-label="${esc(L('ex_always_day'))}">${IC.sky_day}</button>
          <button class="ex-btn ex-speed" type="button" aria-label="${esc(L('ex_speed'))}">×1</button></div>
        <button class="ex-goal" type="button" aria-label="${esc(L('ex_goals'))}"></button>
        <div class="ex-side">
          <button class="ex-btn" type="button" data-a="modes" aria-label="${esc(L('ex_modes'))}" title="${esc(L('ex_modes'))}">${IC.flag}</button>
          <button class="ex-btn" type="button" data-a="rotate" aria-label="${esc(L('ex_rotate'))}" title="${esc(L('ex_rotate'))} (R)">${IC.rotate}</button>
          <button class="ex-btn" type="button" data-a="view" aria-pressed="false" aria-label="${esc(L('ex_view'))}" title="${esc(L('ex_view'))} (F)">${IC.view}</button>
          <button class="ex-btn" type="button" data-a="acc" aria-label="${esc(L('ex_accounts'))}" title="${esc(L('ex_accounts'))}">${IC.chart}</button>
          <button class="ex-btn" type="button" data-a="zin" aria-label="${esc(L('ex_zoomin'))}">${IC.plus}</button>
          <button class="ex-btn" type="button" data-a="zout" aria-label="${esc(L('ex_zoomout'))}">${IC.minus}</button>
        </div>
        <div class="ex-paused" hidden>${esc(L('ex_paused'))}</div>
        <div class="ex-dock">
          <div class="ex-hari" hidden role="status" aria-live="polite">${HH.mascot && HH.mascot.mini ? HH.mascot.mini() : ''}<p></p></div>
          <div class="ex-hint" hidden></div>
          <div class="ex-sub"></div>
        </div>
        <div class="ex-confirm" hidden></div>
        <nav class="ex-tools" aria-label="${esc(L('ex_t_info'))}">${TOOLS.map(([id, k, lock], i) => `<button class="ex-tool" type="button" data-t="${id}" aria-pressed="false"${lock ? ' aria-disabled="true"' : ''} title="${esc(L(k))}${lock ? '' : ` (${[1, 2, 3, 0, 0, 4, 5][i]})`}">${IC[id]}${lock ? `<span class="lock">${IC.lock}</span>` : ''}<span>${esc(L(k))}</span></button>`).join('')}</nav>
        <section class="ex-sheet" hidden role="dialog" aria-modal="false"></section>
        <div class="ex-home" hidden></div>
      </div>`;
      const q = (s) => el.querySelector(s);
      Object.assign(X.ui, { wrap: q('.ex-wrap'), cv: q('.ex-cv'), labels: q('.ex-labels'), money: q('.ex-money .mv'), moneyB: q('.ex-money b'), date: q('.ex-money .dt'),
        speed: q('.ex-speed'), sky: q('.ex-sky'), goal: q('.ex-goal'), side: q('.ex-side'), paused: q('.ex-paused'), hari: q('.ex-hari'), hariP: q('.ex-hari p'), hint: q('.ex-hint'),
        sub: q('.ex-sub'), confirm: q('.ex-confirm'), tools: q('.ex-tools'), sheet: q('.ex-sheet'), home: q('.ex-home'), view: q('[data-a="view"]') });
      X.wrap = X.ui.wrap; X.cv = X.ui.cv;
      const U = X.ui;
      U.tools.onclick = (e) => { const b = e.target.closest('.ex-tool'); if (!b) return; if (b.getAttribute('aria-disabled') === 'true') { X.sfx('tap'); hint(L('ex_h_locked'), 2600); return; } X.setTool(b.dataset.t); };
      U.sub.onclick = (e) => { const b = e.target.closest('.ex-chip'); if (!b) return; if (b.dataset.done) { X.endPick(); return; } X.setSub(b.dataset.s); };
      U.side.onclick = (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        X.sfx('tap');
        ({ rotate: () => X.cam.rotate(1), view: () => X.cam.toggleFree(), acc: () => accounts(), zin: () => X.cam.zoomBy(0.8), zout: () => X.cam.zoomBy(1.25), modes: () => home(true) })[b.dataset.a]();
      };
      U.speed.onclick = () => { X.sfx('tap'); X.cycleSpeed(); };
      U.sky.onclick = () => X.toggleDay();
      el.querySelector('.ex-money').onclick = () => { X.sfx('tap'); accounts(); };
      U.goal.onclick = () => { X.sfx('tap'); accounts(); };
      U.hari.onclick = () => { U.hari.hidden = true; };
      U.sheet.addEventListener('click', onSheet);
      U.home.addEventListener('click', onHome);
      fitTools();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (X.ui.tools && X.ui.tools.isConnected) fitTools(); });
    }

    /* ---------- strumenti ---------- */
    // etichette della barra: una dimensione per tutte, la più grande (10.5px → 9px) con cui ogni parola sta nella sua colonna
    // e ogni etichetta in due righe; sotto i 9px non si scende: le parole ancora troppo lunghe vanno a capo sillabate (schermi da 360px, lingue lunghe come tedesco e finlandese)
    function fitTools() {
      const U = X.ui;
      if (!U.tools || X.land) return;
      const spans = [...U.tools.querySelectorAll('.ex-tool > span:last-child')];
      if (!spans.length || !spans[0].clientWidth) return;
      const fits = () => spans.every((e) => e.scrollWidth <= e.clientWidth + 0.5 && e.scrollHeight <= parseFloat(getComputedStyle(e).fontSize) * 2.4 + 1);
      // in prova: parole intere (niente sillabazione né spezzature), così si rimpicciolisce prima di andare a capo a metà parola
      for (const e of spans) { e.style.overflowWrap = 'normal'; e.style.hyphens = 'manual'; e.style.webkitHyphens = 'manual'; }
      let fs = 10.5;
      U.tools.style.setProperty('--fs', fs + 'px');
      while (fs > 9 && !fits()) { fs -= 0.5; U.tools.style.setProperty('--fs', fs + 'px'); }
      for (const e of spans) { e.style.overflowWrap = ''; e.style.hyphens = ''; e.style.webkitHyphens = ''; }
    }
    function paintTools() {
      const U = X.ui;
      U.tools.querySelectorAll('.ex-tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === X.tool)));
      if (X.picking) {
        U.sub.innerHTML = `<button class="ex-chip" type="button" data-done="1" aria-pressed="true">${IC.check}${esc(L('ex_done'))}</button>`;
        hint(L('ex_h_pick'), 0);
        return;
      }
      const subs = SUBS[X.tool] || [];
      U.sub.innerHTML = subs.map(([id, k, ic]) => `<button class="ex-chip" type="button" data-s="${id}" aria-pressed="${X.sub === id}">${ic}${esc(L(k))}</button>`).join('');
      const hk = { rail: { track: 'ex_h_rail', signal: 'ex_h_signal', oneway: 'ex_h_oneway' }, stop: { station: 'ex_h_station', busstop: 'ex_h_stop' }, road: 'ex_h_road', demolish: 'ex_h_demolish', info: 'ex_h_info' }[X.tool];
      const key = typeof hk === 'object' ? hk[X.sub] : hk;
      if (key) hint(L(key), 3200);
    }
    let hintT = 0;
    function hint(t, ms) {
      const h = X.ui.hint;
      clearTimeout(hintT);
      if (!t) { h.hidden = true; return; }
      h.textContent = t; h.hidden = false;
      if (ms) hintT = setTimeout(() => { if (!X.picking) h.hidden = true; }, ms);
    }

    /* ---------- ora del giorno: icona (sole, tramonto, luna, alba) e "sempre giorno" ---------- */
    let skyKey = '';
    function sky(Lt) {
      const on = X.alwaysDay(), ph = on ? 'day' : Lt.phase, k = ph + on;
      if (k === skyKey) return;
      skyKey = k;
      const U = X.ui;
      U.sky.innerHTML = IC['sky_' + ph];
      U.sky.setAttribute('aria-pressed', String(on));
      U.sky.title = `${L('ex_sky_' + ph)} · ${L('ex_always_day')}`;
    }

    /* ---------- barra in alto, obiettivo ---------- */
    let hudKey = '', goalKey = '';
    function hud() {
      const s = X.s, U = X.ui;
      const k = s.money + '|' + s.day + '|' + s.speed + '|' + X.paused;
      if (k !== hudKey) {
        hudKey = k;
        U.money.textContent = nf(s.money);
        U.moneyB.classList.toggle('neg', s.money < 0);
        U.date.textContent = fmtDate(s.day);
        U.speed.textContent = s.speed ? '×' + s.speed : '';
        if (!s.speed) U.speed.innerHTML = IC.play;
        U.speed.dataset.v = String(s.speed);
        U.paused.hidden = !!s.speed;
      }
      goal();
    }
    function goalLine(g) {
      if (g.k === 'del') {
        const place = g.ind != null ? indName(X.s.inds[g.ind].type) : g.town != null ? X.s.towns[g.town].name : '';
        return { ic: cargoIc(g.c), t: place ? L('ex_g_del_to', { n: nf(g.n), cargo: cargoName(g.c), place }) : L('ex_g_del', { n: nf(g.n), cargo: cargoName(g.c) }) };
      }
      if (g.k === 'train') return { ic: vehIc('castagna'), t: L('ex_g_train', { n: g.n }) };
      return { ic: IC.house, t: L('ex_g_pop', { town: X.s.towns[g.town].name, n: nf(g.n) }) };
    }
    function goal() {
      const s = X.s, U = X.ui;
      if (s.mode === 'free') {
        const pop = s.towns.reduce((a, t) => a + t.pop, 0);
        const k = 'f' + pop + s.veh.length;
        if (k === goalKey) return; goalKey = k;
        U.goal.innerHTML = `<small>${esc(L('ex_freeplay'))}</small><span class="gl">${IC.house}${esc(L('ex_inhab', { n: nf(pop) }))}</span><span class="gl">${vehIc('bus')}${s.veh.length}</span>`;
        return;
      }
      const gs = E.goalState(s), left = Math.max(0, s.deadline - s.day);
      const k = gs.map((g) => g.cur).join() + '|' + left + '|' + X.land;
      if (k === goalKey) return; goalKey = k;
      const p = gs.reduce((a, g) => a + Math.min(1, g.cur / g.n), 0) / (gs.length || 1);
      const cur = Math.max(0, gs.findIndex((g) => !g.done));
      U.goal.innerHTML = `<small>${esc(L('ex_goal'))}</small>` + gs.map((g, i) => { const l = goalLine(g); return `<span class="gl${g.done ? ' done' : ''}${i === cur ? ' cur' : ''}">${l.ic.replace('<svg', '<svg width="18" height="18"')}<span class="gt">${esc(l.t)}</span><b>${nf(Math.min(g.cur, g.n))}/${nf(g.n)}</b></span>`; }).join('')
        + `<span class="ex-bar"><i style="width:${Math.round(p * 100)}%"></i></span><span class="left">${esc(L('ex_left', { d: nf(left) }))}</span>`;
      U.goal.classList.toggle('mini', X.land);
    }

    /* ---------- fumetto di Hari ---------- */
    let sayT = 0, lastCoach = '';
    function say(text, ms = 7000) {
      const U = X.ui;
      U.hariP.textContent = text; U.hari.hidden = false;
      clearTimeout(sayT);
      sayT = setTimeout(() => { U.hari.hidden = true; }, ms);
    }
    function coach(force) {
      const k = E.coach(X.s);
      if (k === lastCoach && !force) return;
      lastCoach = k;
      say(L(k), 9000);
    }

    /* ---------- anteprima del costo ---------- */
    function confirm(p, kind) {
      const U = X.ui, s = X.s, n = p.tiles.length;
      const upkeep = Math.round(n * (kind === 'rail' ? 12 : 6));
      const poor = p.cost > s.money;
      U.confirm.innerHTML = `<small>${esc(L('ex_preview'))}</small>
        <div class="cost"><b>${esc(L('ex_tiles', { n }))} · ${acorn}${nf(p.cost)}</b>${poor ? `<span class="bad">${esc(L('ex_err_money'))}</span>` : `<span>${esc(L('ex_upkeep', { n: nf(upkeep) }))}</span>`}</div>
        <div class="acts"><button class="ex-btn soft" type="button" data-c="no">${IC.close}<span>${esc(L('lf_cancel'))}</span></button>
        <button class="ex-btn main" type="button" data-c="ok"${poor ? ' disabled' : ''}>${IC.check}<span>${esc(L('ex_build'))}</span></button></div>`;
      U.confirm.hidden = false;
      U.confirm.onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; if (b.dataset.c === 'ok') X.commitBuild(); else X.cancelBuild(); };
      const ok = U.confirm.querySelector('[data-c="ok"]'); if (ok && !poor) ok.focus({ preventScroll: true });
    }
    const hideConfirm = () => { X.ui.confirm.hidden = true; X.ui.confirm.innerHTML = ''; };

    /* ---------- schede ---------- */
    let sheetKind = null, sheetArg = null, draft = null;
    function open(html, kind, arg) {
      const sh = X.ui.sheet;
      const same = !sh.hidden && sheetKind === kind && sheetArg === arg;
      sheetKind = kind; sheetArg = arg;
      const full = `<span class="grab" aria-hidden="true"></span>${html}`;
      // aggiornamento della stessa scheda: si riscrive solo se è cambiato qualcosa, e senza spostare il fuoco
      if (same) { if (sh._html !== full) { sh.innerHTML = full; sh._html = full; } return; }
      sh.innerHTML = full; sh._html = full;
      sh.hidden = false;
      const f = sh.querySelector('[data-k="close"]') || sh.querySelector('button');
      if (f) f.focus({ preventScroll: true });
      X.onSheet(kind, arg);
    }
    function close() { const sh = X.ui.sheet; if (sh.hidden) return; sh.hidden = true; sh.innerHTML = ''; sheetKind = null; sheetArg = null; X.onSheet(null); }
    const isOpen = () => !X.ui.sheet.hidden;
    const head = (ic, title, sub) => `<header><span class="ic">${ic}</span><div><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}</div><button class="ex-btn soft" type="button" data-k="close" aria-label="${esc(L('er_close'))}">${IC.close}</button></header>`;
    function refresh() {
      if (!isOpen() || X.picking) return;
      const y = X.ui.sheet.scrollTop;
      if (sheetKind === 'station') station(sheetArg, true);
      else if (sheetKind === 'veh') vehicle(sheetArg, true);
      else if (sheetKind === 'town') town(sheetArg, true);
      else if (sheetKind === 'ind') industry(sheetArg, true);
      else if (sheetKind === 'acc') accounts(true);
      X.ui.sheet.scrollTop = y;
    }
    function station(id, keepFocus) {
      const s = X.s, st = s.stations[id];
      if (!st) { close(); return; }
      const cv = S.cov(s, X.W, id), towns = Object.keys(cv.towns).map((k) => s.towns[k]);
      const pop = towns.reduce((a, t) => a + t.pop, 0);
      const cs = Object.keys(st.pick);
      const rate = cs.length ? cs.reduce((a, c) => a + st.rate[c], 0) / cs.length : 0;
      const last = cs.length ? Math.min(...cs.map((c) => s.day - (st.last[c] || 0))) : -1;
      const wait = Object.keys(st.wait).filter((c) => st.wait[c] > 0);
      const vs = s.veh.filter((v) => v.orders.some((o) => o.st === id) || X.W.st[v.t] === id + 1);
      const acc = Object.keys(cv.acc);
      const html = head(indIc(st.kind === 'rail' ? 'station' : 'stop'), stName(st), (st.kind === 'rail' ? L('ex_rail_station') : L('ex_road_stop')) + (pop ? ' · ' + L('ex_inhab', { n: nf(pop) }) : ''))
        + `<div class="ex-acts"><button class="ex-btn main" type="button" data-k="newv">${IC.plus}<span>${esc(st.kind === 'rail' ? L('ex_newtrain') : L('ex_newroad'))}</span></button></div>`
        + `<div class="ex-card"><div class="ex-meter"><span>${esc(L('ex_rating'))}</span><span class="ex-bar"><i style="width:${pct(rate)}"></i></span><b>${pct(rate)}</b></div>
          <p>${esc(last < 0 ? L('ex_novisit') : L('ex_lastv', { d: nf(last) }))}</p></div>
        <div class="ex-card"><h4>${esc(L('ex_waiting'))}</h4>${wait.length ? wait.map((c) => `<div class="ex-row">${cargoIc(c)}<span>${esc(cargoName(c))}</span><b>${nf(st.wait[c])}</b></div>`).join('') : `<p>${esc(L('ex_nothing'))}</p>`}</div>
        <div class="ex-card"><h4>${esc(L('ex_accepts'))}</h4><div class="ex-cars">${acc.length ? acc.map((c) => `<span class="ex-row" title="${esc(cargoName(c))}">${cargoIc(c)}<span>${esc(cargoName(c))}</span></span>`).join('') : '—'}</div></div>
        <div class="ex-card"><h4>${esc(L('ex_passing'))}</h4>${vs.length ? vs.map((v) => `<button class="ex-opt" type="button" data-v="${v.id}">${vehIc(v.type)}<div><b>${esc(vName(v))}</b><small>${esc(status(v))} · ${v.profit >= 0 ? '+' : ''}${nf(v.profit)}</small></div></button>`).join('') : '—'}</div>`;
      open(html, 'station', id);
      if (keepFocus) return;
      X.showArea(st);
    }
    function status(v) {
      const o = v.orders[v.oi], st = o && X.s.stations[o.st];
      if (v.mode === 'lost') return L('ex_st_lost');
      if (v.mode === 'load') return L('ex_st_load', { st: stName(st) });
      if (S.isTrain(v) && v.mode === 'go' && (v.bk || 0) > S.TPD) return L('ex_st_wait');
      return L('ex_st_go', { st: stName(st) });
    }
    function vehicle(id) {
      const s = X.s, v = s.veh.find((x) => x.id === id);
      if (!v) { close(); return; }
      const caps = S.caps(v);
      const html = head(vehIc(v.type), vName(v), status(v))
        + `<div class="ex-card"><div class="ex-row"><span>${esc(L('ex_profit'))}</span><b class="${v.profit >= 0 ? 'pos' : 'neg'}">${v.profit >= 0 ? '+' : ''}${nf(v.profit)}</b></div>
          <div class="ex-row"><span>${esc(L('ex_lastyear'))}</span><b>${nf(v.last)}</b></div></div>
        <div class="ex-card"><h4>${esc(L('ex_load'))}</h4>${Object.keys(caps).map((c) => `<div class="ex-row">${cargoIc(c)}<span>${esc(cargoName(c))}</span><b>${nf(v.ld[c] ? v.ld[c][0] : 0)} / ${nf(caps[c])}</b></div>`).join('')}</div>
        <div class="ex-card"><h4>${esc(L('ex_route'))}</h4>${v.orders.map((o, i) => `<div class="ex-order"><span class="n">${i + 1}</span><div><b>${esc(stName(s.stations[o.st]))}</b>${o.full ? `<small>${esc(L('ex_full'))}</small>` : ''}</div></div>`).join('')}</div>
        <div class="ex-acts"><button class="ex-btn soft" type="button" data-k="sell">${esc(L('ex_sell'))} · +${nf(v.value * 0.5)}</button></div>`;
      open(html, 'veh', id);
    }
    function town(id) {
      const t = X.s.towns[id];
      const html = head(indIc('town'), t.name, L('ex_village') + ' · ' + L('ex_houses', { n: t.houses.length }))
        + `<div class="ex-card"><div class="ex-row">${IC.house}<span>${esc(L('ex_inhab', { n: nf(t.pop) }))}</span></div><p>${esc(t.lg > 0 ? L('ex_growing', { n: nf(t.lg) }) : L('ex_notgrow'))}</p></div>
        <div class="ex-card"><h4>${esc(L('ex_accepts'))}</h4><div class="ex-cars">${['pax', 'mail', 'cheese', 'bread', 'toys'].map((c) => `<span class="ex-row">${cargoIc(c)}<span>${esc(cargoName(c))}</span></span>`).join('')}</div></div>`;
      open(html, 'town', id);
    }
    function industry(id) {
      const d = X.s.inds[id], T = HH.expressMap.IND[d.type];
      const html = head(indIc(d.type), indName(d.type), X.s.towns.length ? nearTown(d) : '')
        + `<div class="ex-card"><h4>${esc(L('ex_makes'))}</h4><div class="ex-row">${cargoIc(T.make)}<span>${esc(cargoName(T.make))}</span><b>${esc(L('ex_month', { n: nf(d.lm) }))}</b></div></div>`
        + (T.take ? `<div class="ex-card"><h4>${esc(L('ex_needs'))}</h4>${T.take.map((c) => `<div class="ex-row">${cargoIc(c)}<span>${esc(cargoName(c))}</span></div>`).join('')}</div>` : '');
      open(html, 'ind', id);
    }
    function nearTown(d) { let b = null, bd = 1e9; for (const t of X.s.towns) { const k = Math.abs(t.x - d.x) + Math.abs(t.y - d.y); if (k < bd) { bd = k; b = t; } } return b ? b.name : ''; }
    function accounts(keep) {
      const s = X.s, f = s.fin;
      const rows = [['ex_income', f.inc], ['ex_running', -f.run], ['ex_mnt', -f.mnt], ['ex_building', -f.bld], ['ex_bought', -f.veh]];
      const net = rows.reduce((a, r) => a + r[1], 0);
      const gs = s.mode === 'level' ? E.goalState(s) : [];
      const max = Math.max(1, ...rows.map((r) => Math.abs(r[1])));
      const lv = s.mode === 'level' ? L('level') + ' ' + s.level : L('ex_freeplay');
      const html = head(IC.chart, lv, s.mode === 'level' ? levelTitle(s.level) : '')
        + (gs.length ? `<div class="ex-card"><h4>${esc(L('ex_goals'))}</h4>${gs.map((g) => { const l = goalLine(g); return `<div class="ex-row">${l.ic}<span>${esc(l.t)}</span><b>${nf(Math.min(g.cur, g.n))}</b>${g.done ? IC.check : ''}</div>`; }).join('')}
          <p>${esc(L('ex_left', { d: nf(Math.max(0, s.deadline - s.day)) }))} · ${esc(L('ex_stars3', { d: nf(s.par) }))}</p></div>` : '')
        + `<div class="ex-card"><h4>${esc(L('ex_yearacc'))}<b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${nf(net)}</b></h4>
          <div class="ex-chart" aria-hidden="true">${rows.map((r) => `<i class="${r[1] < 0 ? 'out' : ''}" style="height:${Math.max(4, Math.round(Math.abs(r[1]) / max * 100))}%"></i>`).join('')}</div>
          ${rows.map((r) => `<div class="ex-row"><span>${esc(L(r[0]))}</span><b class="${r[1] >= 0 ? 'pos' : 'neg'}">${r[1] >= 0 ? '+' : ''}${nf(r[1])}</b></div>`).join('')}</div>
        <div class="ex-card"><h4>${esc(L('ex_vlist'))}</h4>${s.veh.length ? s.veh.map((v) => `<button class="ex-opt" type="button" data-v="${v.id}">${vehIc(v.type)}<div><b>${esc(vName(v))}</b><small>${esc(status(v))} · ${v.profit >= 0 ? '+' : ''}${nf(v.profit)}</small></div></button>`).join('') : '—'}</div>
        <div class="ex-card"><h4>${esc(L('ex_rivals'))}</h4><p class="soon">${IC.lock}${esc(L('ex_rivals_soon'))}</p></div>`;
      open(html, 'acc', null);
      void keep;
    }
    const levelTitle = (n) => (n <= 5 ? L('ex_l' + n) : L('ex_lx', { n: n - 5 }));

    /* ---------- nuovo mezzo e percorso ---------- */
    function newVehicle(stId) {
      const st = X.s.stations[stId];
      if (!st) return;
      const rail = st.kind === 'rail';
      draft = draft && draft.from === stId ? draft : { from: stId, rail, type: rail ? 'castagna' : 'bus', cargo: 'milk', cars: rail ? ['pax'] : [], orders: [{ st: stId, full: false }] };
      if (rail && draft.cars.length === 1 && draft.cars[0] === 'pax') {
        // primo vagone: la merce che aspetta qui, o quella dell'industria vicina
        const cv = S.cov(X.s, X.W, stId), mk = cv.inds.map((i) => HH.expressMap.IND[X.s.inds[i].type].make);
        if (mk.length) draft.cars = [mk[0], mk[0], mk[0]];
      }
      if (!rail && draft.type === 'truck' && !draft.cargoSet) {
        const cv = S.cov(X.s, X.W, stId), mk = cv.inds.map((i) => HH.expressMap.IND[X.s.inds[i].type].make);
        if (mk.length) draft.cargo = mk[0];
      }
      drawDraft();
    }
    function draftCost() { return E.vehCost({ type: draft.type, cars: draft.cars }); }
    function tripDays() {
      const s = X.s, w = X.W, os = draft.orders;
      if (os.length < 2) return 0;
      let len = 0;
      for (let i = 0; i < os.length; i++) {
        const a = s.stations[os[i].st], b = s.stations[os[(i + 1) % os.length].st];
        if (!a || !b) return 0;
        const starts = [];
        for (const t of a.tiles) for (let d = 0; d < 4; d++) { const m = w[a.kind][t]; if (m & (1 << d)) { const nx = (t % w.w) + NET.DX[d], ny = ((t / w.w) | 0) + NET.DY[d]; starts.push({ t: ny * w.w + nx, a: NET.opp(d), g: 0, k: d }); } }
        const r = NET.route(w, a.kind, starts, b.id, b.tiles);
        if (!r) return -1;
        len += r.len;
      }
      return Math.round(len / S.VT[draft.type].spd + os.length);
    }
    function drawDraft() {
      const s = X.s, rail = draft.rail, yr = E.date(s.day).y;
      const types = rail ? ['castagna', 'fragola'] : ['bus', 'mail', 'truck'];
      const opt = (t) => {
        const T = S.VT[t], locked = T.from && yr < T.from + 1;
        const nm = t === 'castagna' ? 'Castagna' : t === 'fragola' ? 'Fragola' : L('ex_v_' + t);
        const sub = rail ? (t === 'castagna' ? L('ex_v_steam') : L('ex_v_electric')) + ' · ' + L('ex_v_speed', { n: T.spd }) : L('ex_v_speed', { n: T.spd }) + ' · ' + L('ex_v_cap', { n: T.cap, cargo: cargoName(t === 'truck' ? draft.cargo : T.cargo[0]) });
        return `<button class="ex-opt" type="button" data-type="${t}" aria-pressed="${draft.type === t}"${locked ? ' aria-disabled="true"' : ''}>${vehIc(t)}<div><b>${esc(nm)}</b><small>${esc(locked ? L('ex_v_from', { n: T.from + 1 }) : sub)}</small><small>${acorn.replace('<svg', '<svg class="ac"')} ${nf(T.cost)} · −${nf(T.run)}/${esc(L('ex_year', { n: '' }).trim())}</small></div></button>`;
      };
      const cargoPick = !rail && draft.type === 'truck' ? `<div class="ex-card"><h4>${esc(L('ex_cargo'))}</h4><div class="ex-cars">${S.VT.truck.cargo.map((c) => `<button class="ex-chip" type="button" data-cargo="${c}" aria-pressed="${draft.cargo === c}">${cargoIc(c)}${esc(cargoName(c))}</button>`).join('')}</div></div>` : '';
      const counts = {};
      for (const c of draft.cars) counts[c] = (counts[c] || 0) + 1;
      const wag = rail ? `<div class="ex-card"><h4>${esc(L('ex_wagons'))}<small>${draft.cars.length} / ${S.WAGON.max}</small></h4><div class="ex-cars">${S.CARGOS.map((c) => `<span class="ex-chip" style="box-shadow:none"><button class="ex-chip" type="button" data-wdel="${c}" aria-label="${esc(L('ex_remove'))} ${esc(cargoName(c))}" style="box-shadow:none;height:28px;padding:0 6px">${IC.minus}</button>${cargoIc(c)}<b>${counts[c] || 0}</b><button class="ex-chip" type="button" data-wadd="${c}" aria-label="+ ${esc(cargoName(c))}" style="box-shadow:none;height:28px;padding:0 6px">${IC.plus}</button></span>`).join('')}</div></div>` : '';
      const days = tripDays();
      const orders = `<div class="ex-card"><h4>${esc(L('ex_route'))}<small>${esc(L('ex_tapst'))}</small></h4>${draft.orders.map((o, i) => `<div class="ex-order"><span class="n">${i + 1}</span><div><b>${esc(stName(s.stations[o.st]))}</b></div>
          <button class="ex-chip" type="button" data-full="${i}" aria-pressed="${o.full}">${esc(L('ex_full'))}</button>${i ? `<button class="ex-chip" type="button" data-odel="${i}" aria-label="${esc(L('ex_remove'))}">${IC.close}</button>` : ''}</div>`).join('')}
        <button class="ex-btn soft" type="button" data-k="pick">${IC.plus}<span>${esc(L('ex_addstop'))}</span></button>
        ${days > 0 ? `<p>${esc(L('ex_trip', { d: nf(days) }))}</p>` : days < 0 ? `<p class="bad">${esc(L('ex_err_noroute'))}</p>` : ''}</div>`;
      const cost = draftCost(), ok = draft.orders.length >= 2 && cost <= s.money && (!rail || draft.cars.length) && days >= 0;
      const html = head(vehIc(rail ? 'castagna' : 'bus'), rail ? L('ex_newtrain') : L('ex_newroad'), stName(s.stations[draft.from]))
        + `<div class="ex-pick">${types.map(opt).join('')}</div>${cargoPick}${wag}${orders}
        <div class="ex-total"><span>${esc(L('ex_total'))} <b>${acorn}${nf(cost)}</b></span><button class="ex-btn main" type="button" data-k="buy"${ok ? '' : ' disabled'}>${IC.check}<span>${esc(L('ex_buy'))}</span></button></div>`;
      open(html, 'new', draft.from);
    }
    function addOrder(stId) {
      if (!draft) return false;
      const st = X.s.stations[stId];
      if (!st || (st.kind === 'rail') !== draft.rail) return false;
      if (draft.orders.length && draft.orders[draft.orders.length - 1].st === stId) return false;
      draft.orders.push({ st: stId, full: false });
      return true;
    }
    function onSheet(e) {
      const b = e.target.closest('button');
      if (!b || b.getAttribute('aria-disabled') === 'true') return;
      X.sfx('tap');
      const k = b.dataset.k;
      if (k === 'close') { close(); return; }
      if (k === 'newv') { draft = null; newVehicle(sheetArg); return; }
      if (k === 'sell') { X.act({ k: 'sell', id: sheetArg }); close(); return; }
      if (b.dataset.v) { vehicle(+b.dataset.v); return; }
      if (!draft) return;
      if (b.dataset.type) { draft.type = b.dataset.type; drawDraft(); return; }
      if (b.dataset.cargo) { draft.cargo = b.dataset.cargo; draft.cargoSet = true; drawDraft(); return; }
      if (b.dataset.wadd) { if (draft.cars.length < S.WAGON.max) draft.cars.push(b.dataset.wadd); drawDraft(); return; }
      if (b.dataset.wdel) { const i = draft.cars.lastIndexOf(b.dataset.wdel); if (i >= 0) draft.cars.splice(i, 1); drawDraft(); return; }
      if (b.dataset.full) { const o = draft.orders[+b.dataset.full]; o.full = !o.full; drawDraft(); return; }
      if (b.dataset.odel) { draft.orders.splice(+b.dataset.odel, 1); drawDraft(); return; }
      if (k === 'pick') { X.startPick(); return; }
      if (k === 'buy') {
        const r = X.act({ k: 'buy', type: draft.type, cargo: draft.type === 'truck' ? draft.cargo : undefined, cars: draft.rail ? draft.cars : undefined, orders: draft.orders });
        if (r.ok) { const rail = draft.rail; draft = null; close(); X.sfx(rail ? 'whistle' : 'horn'); }
      }
    }
    const draftOpen = () => sheetKind === 'new' && draft;

    /* ---------- scelta della modalità ---------- */
    let freeOpts = null;
    function home(show) {
      const h = X.ui.home;
      if (!show) { h.hidden = true; h.innerHTML = ''; return; }
      const camp = X.campLevel(), unlocked = camp >= E.FREE_AT, s = X.s;
      freeOpts = freeOpts || Object.assign({ size: 32, water: 1, seed: Math.floor(Math.random() * 99999) + 1 }, X.freeOpts());
      const seg = (name, vals) => `<div class="ex-seg">${vals.map(([v, k]) => `<button class="ex-chip" type="button" data-${name}="${v}" aria-pressed="${freeOpts[name] === v}">${esc(L(k))}</button>`).join('')}</div>`;
      h.innerHTML = `<h2>Hari Express</h2><p>${esc(L('ex_where'))} ${esc(L('ex_where2'))}</p>
        <div class="ex-mode"><header>${vehIc('castagna')}<div><b>${esc(L('ex_campaign'))}</b><small>${esc(L('ex_lvl', { n: camp, title: levelTitle(camp) }))}</small></div></header>
          <button class="ex-btn main" type="button" data-m="camp">${IC.play}<span>${esc(L('play'))}</span></button></div>
        <div class="ex-mode${unlocked ? '' : ' locked'}"><header>${indIc('town')}<div><b>${esc(L('ex_freeplay'))}</b><small>${esc(L('ex_free_desc', { n: E.FREE_AT }))}</small></div>${unlocked ? '' : `<span class="lockt">${IC.lock}${esc(L('level'))} ${E.FREE_AT}</span>`}</header>
          ${unlocked ? `<label class="ex-field">${esc(L('ex_seed'))}<span class="ex-seg"><input type="number" inputmode="numeric" min="1" max="999999" value="${freeOpts.seed}" data-seedin="1"><button class="ex-chip" type="button" data-dice="1" aria-label="${esc(L('ex_seed'))}">${IC.dice}</button></span></label>
          <div class="ex-field">${esc(L('ex_size'))}${seg('size', [[32, 'ex_sz_s'], [48, 'ex_sz_m'], [64, 'ex_sz_l']])}</div>
          <div class="ex-field">${esc(L('ex_water'))}${seg('water', [[0, 'ex_w0'], [1, 'ex_w1'], [2, 'ex_w2']])}</div>
          <div class="ex-acts">${s.mode === 'free' ? `<button class="ex-btn soft" type="button" data-m="freeback">${IC.play}<span>${esc(L('resume'))}</span></button>` : ''}<button class="ex-btn main" type="button" data-m="free">${IC.check}<span>${esc(L('ex_create'))}</span></button></div>` : ''}</div>
        <div class="ex-mode locked"><header>${IC.flag.replace('<svg', '<svg width="52" height="52"')}<div><b>${esc(L('ex_real'))}</b><small>${esc(L('ex_real_desc'))}</small></div><span class="lockt">${IC.lock}${esc(L('soon'))}</span></header>
          <div class="places"><span>Ostia</span><span>Desenzano</span><span>Ortigia</span></div><small>© OpenStreetMap contributors</small></div>`;
      h.hidden = false;
      const first = h.querySelector('button'); if (first) first.focus({ preventScroll: true });
    }
    function onHome(e) {
      const b = e.target.closest('button');
      if (!b) return;
      X.sfx('tap');
      if (b.dataset.size) { freeOpts.size = +b.dataset.size; home(true); return; }
      if (b.dataset.water) { freeOpts.water = +b.dataset.water; home(true); return; }
      if (b.dataset.dice) { freeOpts.seed = Math.floor(Math.random() * 99999) + 1; home(true); return; }
      const m = b.dataset.m;
      const inp = X.ui.home.querySelector('[data-seedin]');
      if (inp) freeOpts.seed = Math.max(1, Math.min(999999, parseInt(inp.value, 10) || 1));
      if (m === 'camp') { home(false); X.goMode('level'); }
      else if (m === 'free') { home(false); X.goMode('free', Object.assign({}, freeOpts)); }
      else if (m === 'freeback') home(false);
    }

    /* ---------- etichette sulla mappa ---------- */
    const lbls = new Map();
    let lblKey = '';
    function labels(project, zoom) {
      const s = X.s, layer = X.ui.labels;
      const want = [];
      for (const t of s.towns) want.push(['t' + t.id, t.x + 0.5, t.y + 0.5, 0.9, `${esc(t.name)}<small>${nf(t.pop)}</small>`, 'ex-lbl']);
      if (zoom < 14) for (const d of s.inds) want.push(['i' + d.id, d.x + 1, d.y + 1, 1.2, indIc(d.type), 'ex-lbl ind']);
      if (zoom < 9) for (const st of s.stations) if (st) { const t = st.tiles[0]; want.push(['s' + st.id, (t % X.W.w) + 0.5, ((t / X.W.w) | 0) + 0.5, 0.6, esc(stName(st)), 'ex-lbl st']); }
      const k = want.map((x) => x[0] + x[4].length).join();
      if (k !== lblKey) {
        lblKey = k;
        const keepIds = new Set(want.map((x) => x[0]));
        for (const [id, e] of lbls) if (!keepIds.has(id)) { e.remove(); lbls.delete(id); }
        for (const x of want) {
          let e = lbls.get(x[0]);
          if (!e) { e = document.createElement('div'); layer.appendChild(e); lbls.set(x[0], e); }
          e.className = x[5]; e.innerHTML = x[4];
        }
      }
      const W0 = layer.clientWidth, H0 = layer.clientHeight;
      for (const x of want) {
        const e = lbls.get(x[0]), p = project(x[1], x[3], x[2]);
        const vis = p.z < 1 && p.x > -40 && p.y > -10 && p.x < W0 + 40 && p.y < H0 + 30;
        e.hidden = !vis;
        if (vis) e.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
      }
    }
    // ghiande che volano sopra la stazione
    let pops = 0;
    function pop(x, z, money, project) {
      if (pops > 6) return;
      const p = project(x, 0.6, z);
      if (p.z >= 1) return;
      const e = document.createElement('span');
      e.className = 'ex-pop'; e.innerHTML = `+${acorn}${nf(money)}`;
      e.style.left = p.x + 'px'; e.style.top = p.y + 'px';
      X.ui.labels.appendChild(e); pops++;
      setTimeout(() => { e.remove(); pops--; }, 1400);
    }
    return { build, fitTools, hud, sky, hint, say, coach, confirm, hideConfirm, open, close, isOpen, refresh, station, vehicle, town, industry, accounts, newVehicle, addOrder,
      draftOpen, drawDraft, home, labels, pop, paintTools, fmtDate, nf, stName, vName, levelTitle, get sheetKind() { return sheetKind; }, get sheetArg() { return sheetArg; } };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
