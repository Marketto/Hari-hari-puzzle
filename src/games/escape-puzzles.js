/* Hari Escape — sotto-puzzle (tubi, specchi, labirinto, lampadine, scorrimento, bilancia) e creazione degli enigmi.
 * Logica pura (niente DOM), parte di escape-logic.js: si carica prima e escape-logic.js la monta con HH.escapePuzzles(EK).
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // EK = contesto condiviso con escape-logic.js (nomi stabili + getter/setter dello stato che cambia)
  HH.escapePuzzles = function (EK) {
    const { GEMS, GLYPHS, TOYS, PICS, CLUE_OF, ri, pick, shuffle, range } = EK;
    /* ---------- sotto-puzzle ---------- */
    const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];               // 0 N · 1 E · 2 S · 3 O
    const rotMask = (m, r) => { for (let i = 0; i < (r & 3); i++) m = ((m << 1) | (m >> 3)) & 15; return m; };
    const PIPE = { I: 5, L: 3, T: 7 };                           // N=1 E=2 S=4 O=8

    // tubi: l'acqua entra da sinistra (riga src) ed esce a destra (riga dst)
    function pipeFlow(w, h, src, dst, kinds, rots) {
      const mask = (i) => rotMask(PIPE[kinds[i]], rots[i]);
      const s0 = src * w;
      if (!(mask(s0) & 8)) return { ok: false, wet: [] };
      const seen = new Set([s0]), q = [s0];
      while (q.length) {
        const c = q.shift(), x = c % w, y = (c / w) | 0, m = mask(c);
        for (let d = 0; d < 4; d++) {
          if (!(m & (1 << d))) continue;
          const nx = x + DX[d], ny = y + DY[d];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (seen.has(n) || !(mask(n) & (1 << ((d + 2) % 4)))) continue;
          seen.add(n); q.push(n);
        }
      }
      const e = dst * w + w - 1;
      return { ok: seen.has(e) && !!(mask(e) & 2), wet: [...seen] };
    }
    function makePipes(c, rnd) {
      const { w, h } = c.pipes;
      for (let tries = 0; tries < 60; tries++) {
        const src = ri(rnd, h), dst = ri(rnd, h);
        // cammino casuale senza incroci da (0,src) a (w-1,dst), con preferenza per giri lunghi
        const path = [], seen = new Set();
        const dfs = (x, y) => {
          const c0 = y * w + x;
          path.push(c0); seen.add(c0);
          if (x === w - 1 && y === dst && path.length >= w + 1) return true;
          const ds = shuffle([0, 1, 2, 3], rnd);
          for (const d of ds) {
            const nx = x + DX[d], ny = y + DY[d];
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(ny * w + nx)) continue;
            if (dfs(nx, ny)) return true;
          }
          path.pop(); seen.delete(c0);
          return false;
        };
        if (!dfs(0, src)) continue;
        const kinds = [], sol = [];
        for (let i = 0; i < w * h; i++) { kinds.push(rnd() < 0.5 ? 'I' : 'L'); sol.push(ri(rnd, 4)); }
        const dirTo = (a, b) => { const ax = a % w, ay = (a / w) | 0, bx = b % w, by = (b / w) | 0; return bx > ax ? 1 : bx < ax ? 3 : by > ay ? 2 : 0; };
        path.forEach((cell, k) => {
          const din = k === 0 ? 3 : (dirTo(cell, path[k - 1]));
          const dout = k === path.length - 1 ? 1 : dirTo(cell, path[k + 1]);
          const m = (1 << din) | (1 << dout);
          const kind = (din + 2) % 4 === dout ? 'I' : 'L';
          kinds[cell] = kind;
          sol[cell] = [0, 1, 2, 3].find((r) => rotMask(PIPE[kind], r) === m);
        });
        // qualche tubo a T fuori dal cammino (solo nei livelli con la griglia grande)
        if (w * h >= 12) range(w * h).filter((i) => !path.includes(i)).forEach((i) => { if (rnd() < 0.25) kinds[i] = 'T'; });
        const rots = sol.map(() => ri(rnd, 4));
        // almeno metà dei tubi del cammino da girare, e all'inizio l'acqua non arriva
        path.forEach((cell) => { if (rotMask(PIPE[kinds[cell]], rots[cell]) === rotMask(PIPE[kinds[cell]], sol[cell]) && rnd() < 0.7) rots[cell] = (rots[cell] + 1) & 3; });
        if (pipeFlow(w, h, src, dst, kinds, rots).ok) continue;
        return { w, h, src, dst, kinds, init: { r: rots }, secret: { rots: sol, path } };
      }
      // ripiego: riga dritta
      const kinds = range(w * h).map(() => 'I'), sol = range(w * h).map(() => 1);
      return { w, h, src: 0, dst: 0, kinds, init: { r: sol.map((x, i) => (i < w ? 0 : x)) }, secret: { rots: sol, path: range(w) } };
    }

    // specchi: il raggio parte da sinistra (riga src) verso destra; '/' = 0, '\' = 1
    const REFL = [[1, 0, 3, 2], [3, 2, 1, 0]];
    function beam(n, src, mirrors, orient, target) {
      let x = 0, y = src, d = 1;
      const at = {};
      mirrors.forEach((m, i) => { at[m] = i; });
      const cells = [];
      for (let k = 0; k < 4 * n * n + 4; k++) {
        if (x < 0 || y < 0 || x >= n || y >= n) return { hit: false, cells, exit: [x, y] };
        const c = y * n + x;
        cells.push(c);
        if (c === target) return { hit: true, cells };
        if (at[c] != null) d = REFL[orient[at[c]]][d];
        x += DX[d]; y += DY[d];
      }
      return { hit: false, cells };
    }
    function makeMirror(c, rnd) {
      const { n, turns, decoys } = c.mirror;
      for (let tries = 0; tries < 200; tries++) {
        const src = ri(rnd, n);
        let x = 0, y = src, d = 1;
        const seen = new Set([y * n + x]), mirrors = [], sol = [];
        let ok = true, made = 0;
        // primo tratto: almeno una casella dritta
        for (let step = 0; step < 4 * n && made <= turns; step++) {
          const canTurn = step > 0 && made < turns;
          if (canTurn && rnd() < 0.5) {
            const nd = rnd() < 0.5 ? (d + 1) % 4 : (d + 3) % 4;
            const nx = x + DX[nd], ny = y + DY[nd];
            if (nx >= 0 && ny >= 0 && nx < n && ny < n && !seen.has(ny * n + nx)) {
              const o = REFL[0][d] === nd ? 0 : 1;
              mirrors.push(y * n + x); sol.push(o);
              d = nd; made++;
            }
          }
          const nx = x + DX[d], ny = y + DY[d];
          if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen.has(ny * n + nx)) { ok = made === turns && mirrors[mirrors.length - 1] !== y * n + x; break; }
          x = nx; y = ny; seen.add(y * n + x);
          if (made === turns && rnd() < 0.45) break;
        }
        if (!ok || made !== turns) continue;
        const target = y * n + x;
        if (mirrors.includes(target)) continue;
        const path = beam(n, src, mirrors, sol, target);
        if (!path.hit) continue;
        const onPath = new Set(path.cells);
        const free = range(n * n).filter((i) => !onPath.has(i));
        shuffle(free, rnd);
        const all = mirrors.slice(), osol = sol.slice();
        for (let k = 0; k < decoys && k < free.length; k++) { all.push(free[k]); osol.push(ri(rnd, 2)); }
        const init = osol.map((o) => o);
        // almeno uno specchio del cammino girato male (e il raggio all'inizio non arriva)
        range(mirrors.length).forEach((i) => { if (rnd() < 0.6) init[i] ^= 1; });
        if (beam(n, src, all, init, target).hit) init[0] ^= 1;
        if (beam(n, src, all, init, target).hit) continue;
        return { n, src, target, mirrors: all, init: { o: init }, secret: { o: osol, path: mirrors.length } };
      }
      return { n, src: 0, target: n - 1, mirrors: [1], init: { o: [0] }, secret: { o: [1], path: 1 } };
    }

    // labirinto perfetto (DFS): open[c] = bit delle direzioni aperte
    function makeMaze(c, rnd) {
      const n = c.maze, open = new Array(n * n).fill(0), seen = new Set([0]), st = [0];
      while (st.length) {
        const cur = st[st.length - 1], x = cur % n, y = (cur / n) | 0;
        const nb = [0, 1, 2, 3].filter((d) => { const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen.has(ny * n + nx); });
        if (!nb.length) { st.pop(); continue; }
        const d = pick(rnd, nb), nxt = (y + DY[d]) * n + x + DX[d];
        open[cur] |= 1 << d; open[nxt] |= 1 << ((d + 2) % 4);
        seen.add(nxt); st.push(nxt);
      }
      const dist = mazeDist(n, open, 0);
      let goal = 0;
      dist.forEach((v, i) => { if (v > dist[goal]) goal = i; });
      return { n, open, start: 0, goal, init: { p: 0 } };
    }
    function mazeDist(n, open, from) {
      const dist = new Array(n * n).fill(-1), q = [from];
      dist[from] = 0;
      while (q.length) {
        const c = q.shift(), x = c % n, y = (c / n) | 0;
        for (let d = 0; d < 4; d++) {
          if (!(open[c] & (1 << d))) continue;
          const m = (y + DY[d]) * n + x + DX[d];
          if (dist[m] < 0) { dist[m] = dist[c] + 1; q.push(m); }
        }
      }
      return dist;
    }
    function mazePath(n, open, from, to) {
      const dist = mazeDist(n, open, to), out = [];
      let c = from;
      while (c !== to && out.length < n * n) {
        const x = c % n, y = (c / n) | 0;
        const d = [0, 1, 2, 3].find((k) => (open[c] & (1 << k)) && dist[(y + DY[k]) * n + x + DX[k]] === dist[c] - 1);
        out.push(d);
        c = (y + DY[d]) * n + x + DX[d];
      }
      return out;
    }

    // lampadine: premere una casella cambia lei e le vicine; obiettivo: tutte accese
    function lightsPress(w, h, b, i) {
      const x = i % w, y = (i / w) | 0, out = b.slice();
      out[i] ^= 1;
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] ^= 1; }
      return out;
    }
    function makeLights(c, rnd) {
      const { w, h, k } = c.lights;
      for (;;) {
        let b = new Array(w * h).fill(1);
        shuffle(range(w * h), rnd).slice(0, k).forEach((i) => { b = lightsPress(w, h, b, i); });
        if (b.some((x) => !x)) return { w, h, init: { b } };
      }
    }
    // risolutore lampadine (BFS su 2^(w·h) stati): elenco delle caselle da premere
    function solveLights(w, h, b) {
      const N = w * h, enc = (a) => a.reduce((m, x, i) => m | (x << i), 0), full = (1 << N) - 1;
      const masks = range(N).map((i) => enc(lightsPress(w, h, new Array(N).fill(0), i)));
      // ogni casella si preme al massimo una volta: prova i sottoinsiemi in ordine di grandezza
      const start = enc(b);
      let best = null;
      for (let sub = 0; sub < 1 << N; sub++) {
        let m = start, cnt = 0;
        for (let i = 0; i < N; i++) if (sub & (1 << i)) { m ^= masks[i]; cnt++; }
        if (m === full && (!best || cnt < best.length)) best = range(N).filter((i) => sub & (1 << i));
      }
      return best || [];
    }

    // puzzle a scorrimento: t[pos] = tessera, la vuota è l'ultima (w·h−1)
    function makeSlide(c, rnd) {
      const { w, h, d } = c.slide, N = w * h;
      for (;;) {
        const t = range(N);
        let blank = N - 1, prev = -1;
        for (let k = 0; k < d; k++) {
          const x = blank % w, y = (blank / w) | 0;
          const nb = [0, 1, 2, 3].map((q) => [x + DX[q], y + DY[q]]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < w && ny < h).map(([nx, ny]) => ny * w + nx).filter((p) => p !== prev);
          const p = pick(rnd, nb);
          t[blank] = t[p]; t[p] = N - 1; prev = blank; blank = p;
        }
        if (t.some((v, i) => v !== i)) return { w, h, pic: pick(rnd, PICS), init: { t } };
      }
    }
    // risolutore A* (distanza di Manhattan) per il suggerimento: prossima posizione da far scorrere
    function solveSlide(w, h, t0, limit = 200000) {
      const N = w * h, key = (t) => t.join(','), goal = range(N).join(',');
      const hfun = (t) => { let s = 0; t.forEach((v, i) => { if (v !== N - 1) s += Math.abs((v % w) - (i % w)) + Math.abs(((v / w) | 0) - ((i / w) | 0)); }); return s; };
      if (key(t0) === goal) return [];
      const heap = [], push = (n) => { heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l].f < heap[m].f) m = l; if (r < heap.length && heap[r].f < heap[m].f) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
      const gsc = new Map([[key(t0), 0]]);
      push({ t: t0, g: 0, f: hfun(t0), path: [] });
      let n = 0;
      while (heap.length && n++ < limit) {
        const cur = pop();
        const k = key(cur.t);
        if (k === goal) return cur.path;
        if (gsc.get(k) < cur.g) continue;
        const b = cur.t.indexOf(N - 1), x = b % w, y = (b / w) | 0;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const p = ny * w + nx, t = cur.t.slice();
          t[b] = t[p]; t[p] = N - 1;
          const kk = key(t), g = cur.g + 1;
          if (gsc.has(kk) && gsc.get(kk) <= g) continue;
          gsc.set(kk, g);
          push({ t, g, f: g + hfun(t), path: cur.path.concat(p) });
        }
      }
      return null;
    }

    // bilancia: pesi distinti, un sottoinsieme fa il peso del pacco
    const subsetSums = (ws, target) => { const out = []; for (let m = 1; m < 1 << ws.length; m++) { let s = 0; ws.forEach((w, i) => { if (m & (1 << i)) s += w; }); if (s === target) out.push(m); } return out; };
    function makeBalance(c, rnd, wantMissing) {
      const { k, pick: np } = c.balance;
      for (let tries = 0; tries < 200; tries++) {
        const ws = shuffle(range(7).map((i) => i + 1), rnd).slice(0, k);
        const sol = shuffle(range(k), rnd).slice(0, np);
        const target = sol.reduce((a, i) => a + ws[i], 0);
        if (target > 14) continue;
        let missing = -1;
        if (wantMissing) {
          missing = pick(rnd, sol);
          const rest = ws.map((w, i) => (i === missing ? 1000 : w));
          if (subsetSums(rest, target).length) continue;          // senza il peso mancante non si pareggia
        }
        return { target, weights: ws, missing, init: { on: ws.map(() => 0) }, secret: { on: sol } };
      }
      return { target: 3, weights: [1, 2, 4].slice(0, k), missing: -1, init: { on: [0, 0, 0] }, secret: { on: [0, 1] } };
    }

    /* ---------- creazione degli enigmi ---------- */
    function pickGems(rnd, k) { return shuffle(range(GEMS.length), rnd).slice(0, k); }
    function seqFrom(rnd, opts, len, repeats) {
      const out = [];
      while (out.length < len) {
        const g = pick(rnd, opts);
        if (out.length && out[out.length - 1] === g) continue;     // mai due uguali di fila
        if (!repeats && out.includes(g) && opts.length >= len) continue;
        out.push(g);
      }
      return out;
    }
    function makeDigits(type, c, rnd) {
      const len = c.code;
      const dials = pickGems(rnd, len + 1), decoy = dials.pop();
      let code, clue;
      if (type === 'paint' || type === 'books') {
        code = range(len).map(() => ri(rnd, 10));
        if (code.every((d) => d === 0)) code[0] = 1 + ri(rnd, 9);
        const marks = dials.map((g, i) => ({ g, d: code[i] }));
        if (c.level >= 3) marks.push({ g: decoy, d: ri(rnd, 10) });
        if (!c.ordered) shuffle(marks, rnd);
        clue = type === 'paint' ? { kind: 'paint', marks } : { kind: 'books', books: marks.map((m) => Object.assign(m, { h: ri(rnd, 3) })) };
      } else if (type === 'count') {
        code = range(len).map(() => 1 + ri(rnd, c.countMax));
        const counts = dials.map((g, i) => [g, code[i]]);
        if (c.level >= 4) counts.push([decoy, 1 + ri(rnd, 3)]);
        // formine sparse su una griglia 7×4 (caselle mescolate, niente sovrapposizioni)
        const cells = shuffle(range(28), rnd);
        const dots = [];
        counts.forEach(([g, n]) => { for (let i = 0; i < n; i++) dots.push({ g, c: cells[dots.length] }); });
        clue = { kind: 'count', dots };
      } else if (type === 'clock') {
        code = range(len).map(() => 1 + ri(rnd, 9));
        const clocks = dials.map((g, i) => ({ g, h: code[i] }));
        if (!c.ordered) shuffle(clocks, rnd);
        clue = { kind: 'clock', clocks };
      } else {
        // cipher: messaggio di simboli + tabella simbolo → cifra
        const gl = shuffle(range(GLYPHS.length), rnd).slice(0, c.glyphs);
        const dig = shuffle(range(10), rnd).slice(0, c.glyphs);
        const table = gl.map((g, i) => ({ s: g, d: dig[i] }));
        const msg = shuffle(range(c.glyphs), rnd).slice(0, len).map((i) => gl[i]);
        code = msg.map((g) => table.find((e) => e.s === g).d);
        if (code.every((d) => d === 0)) return makeDigits(type, c, rnd);
        return { dials: null, len, init: { v: new Array(len).fill(0) }, secret: { code }, clue: { kind: 'msg', msg }, table: { kind: 'table', table: shuffle(table, rnd) } };
      }
      return { dials, len, init: { v: new Array(len).fill(0) }, secret: { code }, clue };
    }
    function makePuzzle(type, c, rnd, env) {
      switch (type) {
        case 'paint': case 'count': case 'books': case 'clock': case 'cipher': return makeDigits(type, c, rnd);
        case 'colors': {
          const buttons = pickGems(rnd, c.buttons);
          const seq = seqFrom(rnd, buttons, c.seq, c.repeats);
          return { buttons, len: c.seq, init: { e: [] }, secret: { seq }, clue: { kind: 'balloons', seq } };
        }
        case 'simon': {
          const bars = pickGems(rnd, c.buttons);
          const seq = seqFrom(rnd, range(bars.length), c.seq + 1, c.repeats);
          return { bars, len: seq.length, init: { e: [] }, secret: { seq }, clue: { kind: 'sheet', notes: seq, bars } };
        }
        case 'levers': {
          const n = c.levers;
          let pos;
          do pos = range(n).map(() => ri(rnd, 2)); while (pos.every((p) => p === pos[0]));
          let p0;
          do p0 = range(n).map(() => ri(rnd, 2)); while (p0.every((p, i) => p === pos[i]) || p0.filter((p, i) => p !== pos[i]).length < 2);
          return { n, init: { p: p0 }, secret: { pos }, clue: { kind: 'levers', pos } };
        }
        case 'lights': return makeLights(c, rnd);
        case 'slide': return makeSlide(c, rnd);
        case 'balance': return makeBalance(c, rnd, env.missing);
        case 'pipes': return makePipes(c, rnd);
        case 'maze': return makeMaze(c, rnd);
        case 'mirror': return makeMirror(c, rnd);
        case 'shadow': {
          const toys = shuffle(range(TOYS.length), rnd).slice(0, c.shadow.toys);
          const seq = shuffle(toys.slice(), rnd).slice(0, c.shadow.k);
          const flip = seq.map(() => (c.shadow.flip ? ri(rnd, 2) : 0));
          return { toys, shadows: seq, flip, init: { k: 0 } };
        }
        case 'key': return { g: env.keyGem };
        case 'fish': return {};
        default: return {};
      }
    }
    // ingressi di un enigma: indizio (clue) o oggetto (item)
    function inputsOf(type, pz) {
      if (CLUE_OF[type] && type !== 'cipher') return [{ k: 'clue' }];
      if (type === 'cipher') return [{ k: 'clue' }, { k: 'table' }];
      if (type === 'key') return [{ k: 'item', item: 'key' }];
      if (type === 'fish') return [{ k: 'item', item: 'string' }, { k: 'item', item: 'magnet' }];
      if (type === 'balance' && pz && pz.missing >= 0) return [{ k: 'item', item: 'weight' }];
      return [];
    }
    const LEAF_ONLY = new Set(['slide', 'lights', 'pipes', 'maze', 'mirror', 'shadow']);
    const producible = (inp) => inp.k !== 'table';

    return { DY, DX, rotMask, PIPE, pipeFlow, REFL, beam, mazePath, lightsPress, solveLights, solveSlide, makePuzzle,
      inputsOf, producible };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
