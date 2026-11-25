// Bot di Hari Express per i test: gioca come un giocatore. Vede solo quello che la UI mostra (terreno, acqua, case,
// industrie, strade e binari, stazioni con le merci accettate, obiettivi, ghiande) e usa le stesse azioni della UI:
// l'anteprima del percorso (E.preview, quella del trascinamento), E.act (costruisci, fermata, stazione, semaforo,
// senso unico, compra) ed E.step (il tempo che passa). Non legge il generatore né i siti segreti della mappa: trova
// villaggi e industrie dagli obiettivi (merce → industria che la produce o la accetta) come farebbe chi guarda la mappa.
export function expressBot(HH, opt = {}) {
  const E = HH.express, IND = HH.expressMap.IND;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const log = opt.log ? (...a) => console.log(...a) : () => {};

  const W = (s) => E.world(s);
  const xy = (s, i) => [i % W(s).w, (i / W(s).w) | 0];
  const at = (s, x, y) => (x < 0 || y < 0 || x >= W(s).w || y >= W(s).h ? -1 : y * W(s).w + x);
  const free = (s, i) => { const w = W(s); return i >= 0 && !w.water[i] && !w.use[i] && !w.st[i] && !w.rail[i] && !w.road[i]; };
  const center = (o) => (o.type ? [o.x + 0.5, o.y + 0.5] : [o.x, o.y]);
  const md = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

  // chi produce / chi accetta una merce (dalla scheda delle industrie)
  const producers = (s, c) => s.inds.filter((d) => IND[d.type].make === c);
  const takers = (s, c) => s.inds.filter((d) => (IND[d.type].take || []).includes(c));

  /* ---------- strade ---------- */
  // un capolinea vicino a un sito: villaggio = fine di un braccio della sua strada (verso l'altro sito);
  // industria = casella libera attorno, la più vicina all'altro sito
  function roadEnds(s, site, toward) {
    const w = W(s), out = [];
    if (!site.type) {
      for (let d = 0; d < 4; d++) {
        const e = at(s, site.x + DX[d] * 2, site.y + DY[d] * 2), mid = at(s, site.x + DX[d], site.y + DY[d]);
        if (e >= 0 && w.road[e] && !w.st[mid]) out.push({ end: e, stop: mid, k: md([site.x + DX[d] * 2, site.y + DY[d] * 2], toward) });
      }
    } else {
      for (let y = site.y - 1; y <= site.y + 2; y++) for (let x = site.x - 1; x <= site.x + 2; x++) {
        const i = at(s, x, y);
        if (!free(s, i)) continue;
        out.push({ end: i, stop: i, k: md([x, y], toward) });
      }
    }
    return out.sort((a, b) => a.k - b.k).slice(0, 4);
  }
  // collega due siti con una strada e le fermate → [idA, idB] o null
  function roadLink(s, A, B) {
    const ca = center(A), cb = center(B);
    let best = null;
    for (const ea of roadEnds(s, A, cb)) for (const eb of roadEnds(s, B, ca)) {
      if (md(xy(s, ea.stop), xy(s, eb.stop)) < 3) continue;
      const p = E.preview(s, 'road', ea.end, eb.end);
      if (p.ok && (!best || p.cost < best.p.cost)) best = { ea, eb, p };
    }
    if (!best) return null;
    if (!E.act(s, { k: 'build', kind: 'road', tiles: best.p.tiles }).ok) return null;
    const ids = [];
    for (const e of [best.ea, best.eb]) {
      // una fermata già nostra in quel punto si riusa
      const have = W(s).st[e.stop];
      if (have) { ids.push(have - 1); continue; }
      const r = E.act(s, { k: 'station', kind: 'road', tile: e.stop });
      if (!r.ok) { log('stop fail', r.err); return null; }
      ids.push(r.id);
    }
    return ids;
  }

  /* ---------- binari ---------- */
  // stazione di 2 caselle in piano vicino al sito, con un'uscita libera da entrambi i lati sull'asse ax
  function railSpots(s, site, ax, toward) {
    const w = W(s), out = [];
    for (let y = site.y - 3; y <= site.y + 4; y++) for (let x = site.x - 3; x <= site.x + 4; x++) {
      const dx = ax === 1 ? 1 : 0, dy = ax === 1 ? 0 : 1;
      const t0 = at(s, x, y), t1 = at(s, x + dx, y + dy), b0 = at(s, x - dx, y - dy), b1 = at(s, x + 2 * dx, y + 2 * dy);
      if (![t0, t1, b0, b1].every((i) => free(s, i))) continue;
      if (w.ht[t0] !== w.ht[t1]) continue;
      // dentro l'area di raccolta (3 caselle) dell'industria
      const ok = [t0, t1].some((i) => { const [px, py] = xy(s, i); return px >= site.x - 3 && px <= site.x + 4 && py >= site.y - 3 && py <= site.y + 4; });
      if (!ok) continue;
      out.push({ tiles: [t0, t1], k: md([x, y], toward) });
    }
    return out.sort((a, b) => a.k - b.k);
  }
  const shares = (a, b) => { const set = new Set(a); return b.some((t) => set.has(t)); };
  // due stazioni che si toccano per un lato diventano una sola (si uniscono): il bot le tiene staccate
  const touches = (s, a, b) => { const w = W(s).w, set = new Set(a); return b.some((t) => set.has(t - 1) || set.has(t + 1) || set.has(t - w) || set.has(t + w)); };
  const dir = (s, p, q) => HH.expressNet.dirTo(W(s), p, q);
  // le due estremità di una stazione: [quella verso `to`, l'altra]
  const ends = (s, st, to) => (md(xy(s, st.tiles[0]), to) < md(xy(s, st.tiles[1]), to) ? [st.tiles[0], st.tiles[1]] : [st.tiles[1], st.tiles[0]]);
  // il percorso esce da `e` dritto lungo la banchina (via dall'altra estremità `o`)
  const leaves = (s, path, e, o) => path.length > 1 && path[0] === e && dir(s, o, e) === dir(s, e, path[1]);
  const enters = (s, path, e, o) => path.length > 1 && path[path.length - 1] === e && dir(s, path[path.length - 2], e) === dir(s, e, o);
  // la casella appena fuori dall'estremità e (dalla parte opposta a o)
  const out = (s, e, o) => { const [ex, ey] = xy(s, e), [ox, oy] = xy(s, o); return at(s, 2 * ex - ox, 2 * ey - oy); };
  // anteprima da fuori a fuori, poi si aggiungono le estremità: il binario esce dritto dalle banchine
  function via(s, e1, o1, e2, o2) {
    const a = out(s, e1, o1), b = out(s, e2, o2);
    if (!free(s, a) || !free(s, b)) return null;
    const p = E.preview(s, 'rail', a, b);
    if (!p.ok) return null;
    return { tiles: [e1, ...p.tiles, e2], cost: p.cost + 120 };
  }
  function placeBoth(s, pa, pb, ax) {
    const r1 = E.act(s, { k: 'station', kind: 'rail', tiles: pa.tiles, ax });
    if (!r1.ok) return null;
    const r2 = E.act(s, { k: 'station', kind: 'rail', tiles: pb.tiles, ax });
    if (!r2.ok) return null;
    return [r1.id, r2.id];
  }
  // linea con capolinea (il treno si gira in fondo): stazione A — binario — stazione B. Prima si guarda l'anteprima,
  // poi si mettono le stazioni e si costruisce lo stesso percorso.
  function railLine(s, A, B) {
    const ca = center(A), cb = center(B);
    const ax0 = Math.abs(ca[0] - cb[0]) >= Math.abs(ca[1] - cb[1]) ? 1 : 0;
    for (const ax of [ax0, 1 - ax0]) { const r = railLineAx(s, A, B, ax); if (r) return r; }
    return null;
  }
  function railLineAx(s, A, B, ax) {
    const ca = center(A), cb = center(B);
    const sa = railSpots(s, A, ax, cb).slice(0, 6), sb = railSpots(s, B, ax, ca).slice(0, 6);
    for (const pa of sa) for (const pb of sb) {
      if (shares(pa.tiles, pb.tiles) || touches(s, pa.tiles, pb.tiles)) continue;
      const [a1, a2] = ends(s, pa, cb), [b1, b2] = ends(s, pb, ca);
      const p = via(s, a1, a2, b1, b2);
      if (!p || shares(p.tiles.slice(1, -1), [a1, a2, b1, b2])) continue;
      if (p.cost + 2000 > s.money) continue;
      const ids = placeBoth(s, pa, pb, ax);
      if (!ids || !E.act(s, { k: 'build', kind: 'rail', tiles: p.tiles }).ok) return null;
      return { ids, line: p.tiles };
    }
    return null;
  }
  // anello: andata dall'estremità di A verso B, ritorno dall'altra estremità di B all'altra di A passando per un punto
  // di appoggio di lato (le due vie non si toccano); poi un senso unico per via e semafori ogni 4 caselle
  function railLoop(s, A, B) {
    const ca = center(A), cb = center(B);
    const ax0 = Math.abs(ca[0] - cb[0]) >= Math.abs(ca[1] - cb[1]) ? 1 : 0;
    for (const ax of [ax0, 1 - ax0]) { const r = railLoopAx(s, A, B, ax); if (r) return r; }
    return null;
  }
  function railLoopAx(s, A, B, ax) {
    const ca = center(A), cb = center(B);
    const sa = railSpots(s, A, ax, cb).slice(0, 8), sb = railSpots(s, B, ax, ca).slice(0, 8);
    const mx = (ca[0] + cb[0]) / 2, my = (ca[1] + cb[1]) / 2;
    for (const pa of sa) for (const pb of sb) {
      if (shares(pa.tiles, pb.tiles) || touches(s, pa.tiles, pb.tiles)) continue;
      const [a1, a2] = ends(s, pa, cb), [b1, b2] = ends(s, pb, ca);
      const go = via(s, a1, a2, b1, b2);
      if (!go || shares(go.tiles.slice(1, -1), [a1, a2, b1, b2])) continue;
      let back = null;
      const wps = [];
      for (const off of [4, -4, 6, -6, 3, -3, 8, -8, 5, -5, 10, -10]) for (const along of [0, -3, 3]) wps.push([off, along]);
      for (const [off, al] of wps) {
        const wp = at(s, Math.round(ax === 1 ? mx + al : mx + off), Math.round(ax === 1 ? my + off : my + al));
        if (!free(s, wp) || go.tiles.includes(wp)) continue;
        const b3 = out(s, b2, b1), a3 = out(s, a2, a1);
        if (!free(s, b3) || !free(s, a3) || go.tiles.includes(b3) || go.tiles.includes(a3)) continue;
        const h1 = E.preview(s, 'rail', b3, wp);
        if (!h1.ok) continue;
        const h2 = E.preview(s, 'rail', wp, a3);
        if (!h2.ok) continue;
        const ret = [b2, ...h1.tiles, ...h2.tiles.slice(1), a2];
        if (new Set(ret).size !== ret.length) continue;
        if (shares(ret, go.tiles) || shares(ret.slice(1, -1), [a1, b1, a2, b2])) continue;
        if (go.cost + h1.cost + h2.cost + 2 * 720 + 9000 > s.money) continue;
        back = ret;
        break;
      }
      if (!back) continue;
      const ids = placeBoth(s, pa, pb, ax);
      if (!ids) return null;
      if (!E.act(s, { k: 'build', kind: 'rail', tiles: go.tiles }).ok) return null;
      if (!E.act(s, { k: 'build', kind: 'rail', tiles: back }).ok) return null;
      const w = W(s);
      for (const path of [go.tiles, back]) {
        let done = false, last = -9;
        for (let k = 2; k < path.length - 2; k++) {
          const t = path[k];
          if (w.st[t] || w.road[t] || !(w.rail[t] === 5 || w.rail[t] === 10)) continue;
          if (!done && E.act(s, { k: 'oneway', tile: t, dir: dir(s, t, path[k + 1]) }).ok) { done = true; continue; }
          if (k - last >= 4 && E.act(s, { k: 'signal', tile: t }).ok) last = k;
        }
      }
      return { ids };
    }
    return null;
  }

  /* ---------- partita ---------- */
  const run = (s, hours) => { for (let d = 0; d < hours && !E.isOver(s); d++) E.step(s, E.TPH); };
  function waitFree(s, stId, maxH = 60) {
    const w = W(s);
    for (let d = 0; d < maxH; d++) { if (s.stations[stId].tiles.every((t) => !w.resv[t])) return true; run(s, 1); }
    return false;
  }
  function truck(s, A, B, cargo, full = true, n = 1) {
    const ids = roadLink(s, A, B);
    if (!ids) { log('road link failed', cargo); return false; }
    for (let k = 0; k < n; k++) E.act(s, { k: 'buy', type: 'truck', cargo, orders: [{ st: ids[0], full }, { st: ids[1] }] });
    return ids;
  }
  function goal(s, k, c) { return E.goalState(s).find((g) => g.k === k && (!c || g.c === c)); }

  function play(s, maxH = 2000) {
    const g = E.goalState(s);
    const towns = s.towns;
    const del = (c) => g.find((x) => x.k === 'del' && x.c === c);
    const base = E.config(s.level).base;
    if (base === 1) {
      // due villaggi più vicini tra loro
      let best = null;
      for (const a of towns) for (const b of towns) if (a.id < b.id) { const d = md(center(a), center(b)); if (!best || d < best.d) best = { a, b, d }; }
      const ids = roadLink(s, best.a, best.b);
      if (ids) E.act(s, { k: 'buy', type: 'bus', orders: [{ st: ids[0] }, { st: ids[1] }] });
    } else if (base === 2 || base === 3) {
      const gm = del('milk'), dairy = s.inds[gm.ind];
      const farm = producers(s, 'milk').sort((a, b) => md(center(a), center(dairy)) - md(center(b), center(dairy)))[0];
      truck(s, farm, dairy, 'milk', true, base === 3 ? 2 : 1);
      const gc = del('cheese');
      if (gc) {
        run(s, 20);
        truck(s, dairy, towns[gc.town], 'cheese', true, 1);
      }
    } else if (base === 4) {
      const gg = del('grain'), bakery = s.inds[gg.ind];
      const field = producers(s, 'grain').sort((a, b) => md(center(a), center(bakery)) - md(center(b), center(bakery)))[0];
      let L = null;
      for (const f of producers(s, 'grain').sort((a, b) => md(center(a), center(bakery)) - md(center(b), center(bakery)))) if (!L) L = railLine(s, f, bakery);
      if (!L) { log('rail line failed'); return s; }
      E.act(s, { k: 'buy', type: 'castagna', cars: ['grain', 'grain', 'grain', 'grain'], orders: [{ st: L.ids[0], full: true }, { st: L.ids[1] }] });
      run(s, 15);
      const gb = del('bread');
      truck(s, bakery, towns[gb.town], 'bread', true, 1);
    } else {
      const gw = del('wood'), mill = s.inds[gw.ind];
      const forest = producers(s, 'wood').sort((a, b) => md(center(a), center(mill)) - md(center(b), center(mill)))[0];
      let L = null;
      for (const f of producers(s, 'wood').sort((a, b) => md(center(a), center(mill)) - md(center(b), center(mill)))) if (!L) L = railLoop(s, f, mill);
      if (!L) { log('loop failed'); return s; }
      const tr = { k: 'buy', type: 'castagna', cars: ['wood', 'wood', 'wood'], orders: [{ st: L.ids[0], full: true }, { st: L.ids[1] }] };
      log('buy1', E.act(s, tr));
      run(s, 3);
      if (waitFree(s, L.ids[0])) log('buy2', E.act(s, tr));
      run(s, 10);
      const gp = g.find((x) => x.k === 'pop');
      truck(s, mill, towns[gp.town], 'toys', true, 1);
    }
    // aspetta, e se il tempo passa senza progressi aggiunge un mezzo sulla stessa tratta
    let lastCheck = s.h;
    while (!E.isOver(s) && s.h < maxH) {
      run(s, 10);
      if (s.h - lastCheck >= 120) {
        lastCheck = s.h;
        for (const v of s.veh.slice()) {
          if (s.money < E.vehCost(v) + 2000 || v.type !== 'truck' && v.type !== 'bus') continue;
          const st = s.stations[v.orders[0].st];
          if (st && (st.wait[v.cargo || 'pax'] || 0) > 30) E.act(s, { k: 'buy', type: v.type, cargo: v.cargo, orders: v.orders });
        }
      }
    }
    return s;
  }
  return { play, roadLink, railLine, railLoop, run };
}
