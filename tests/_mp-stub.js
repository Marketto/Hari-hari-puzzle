/* Stub di HH.mp (contratto multiplayer v1) SOLO per test e prove: mai nel catalogo né nel build.
 * - Node: si carica con vm (tests/_mp-stub.mjs) e si usa loopback() con un orologio virtuale (clock).
 * - Browser: gli script di Playwright lo iniettano con addInitScript; pair() collega due pagine dello stesso sito con un
 *   BroadcastChannel (ruolo da ?mp=host|guest o da HH.mpStub.role), con latenza, jitter e perdite finti.
 * API del contratto: pair({ game }) → Promise<Link|null>, loopback({ latency, jitter, loss }) → [hostLink, guestLink],
 * session(link, { tick, sendEvery, step, snapshot, apply, predict }) → Session. In più (solo stub): loopback accetta
 * clock = { now(), after(ms, fn) } e seed; Link.drop() simula la caduta del collegamento.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const realClock = { now: () => (G.performance ? G.performance.now() : Date.now()), after: (ms, fn) => setTimeout(fn, ms) };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // Link generico su un "tubo" (sendRaw) con latenza, jitter e perdite (solo per i messaggi non affidabili)
  function makeLink(role, peer, net) {
    const hs = { message: [], close: [], rtt: [] };
    let open = true, lastRel = 0;
    const link = {
      role, peer, rtt: 2 * net.latency, stats: { sent: 0, lost: 0, bytes: 0 },
      send(msg, { reliable = true } = {}) {
        if (!open) return;
        const txt = JSON.stringify(msg);
        link.stats.sent++; link.stats.bytes += txt.length;
        if (!reliable && net.rnd() < net.loss) { link.stats.lost++; return; }
        let at = net.clock.now() + Math.max(0, net.latency + (net.rnd() * 2 - 1) * net.jitter);
        if (reliable) { at = Math.max(at, lastRel + 0.01); lastRel = at; }
        net.clock.after(at - net.clock.now(), () => net.deliver(link, txt));
      },
      on(type, cb) { (hs[type] = hs[type] || []).push(cb); },
      close(reason = 'closed') { if (!open) return; open = false; net.closed(link, reason); },
      drop() { link.close('lost'); },
      _emit(type, x) { for (const cb of hs[type] || []) cb(x); },
      _open: () => open,
      _shut(reason) { if (!open) return; open = false; link._emit('close', reason); },
    };
    return link;
  }

  function loopback({ latency = 40, jitter = 10, loss = 0, clock = realClock, seed = 7 } = {}) {
    const net = { latency, jitter, loss, clock, rnd: rng(seed) };
    const a = makeLink('host', { name: 'Ospite', avatar: 'kitty' }, net), b = makeLink('guest', { name: 'Host', avatar: 'hari' }, net);
    net.deliver = (from, txt) => { const to = from === a ? b : a; if (to._open()) to._emit('message', JSON.parse(txt)); };
    net.closed = (from, reason) => { from._emit('close', reason); const to = from === a ? b : a; clock.after(latency, () => to._shut(reason)); };
    return [a, b];
  }

  // nel browser: due pagine con un BroadcastChannel
  function pair(opts = {}) {
    const st = HH.mpStub || {}, q = G.location ? new URLSearchParams(G.location.search) : null;
    const role = opts.role || st.role || (q && q.get('mp')) || 'host';
    if (!G.BroadcastChannel) return Promise.resolve(null);
    const ch = new G.BroadcastChannel('hh-mp-stub-' + (opts.game || 'x'));
    const net = { latency: st.latency || 40, jitter: st.jitter || 10, loss: st.loss || 0, clock: realClock, rnd: rng(st.seed || 11) };
    const link = makeLink(role, { name: role === 'host' ? 'Ospite' : 'Host', avatar: role === 'host' ? 'kitty' : 'hari' }, net);
    net.deliver = (from, txt) => ch.postMessage({ from: role, txt });
    net.closed = (from, reason) => { from._emit('close', reason); ch.postMessage({ from: role, bye: 1 }); };
    return new Promise((resolve) => {
      let done = false;
      const ok = () => { if (!done) { done = true; resolve(link); } };
      ch.onmessage = (e) => {
        const m = e.data;
        if (!m || m.from === role) return;
        if (m.hi) { if (role === 'host') ch.postMessage({ from: role, hi: 1 }); ok(); return; }
        if (m.bye) { link._shut('lost'); return; }
        if (m.txt && link._open()) link._emit('message', JSON.parse(m.txt));
      };
      ch.postMessage({ from: role, hi: 1 });
      const iv = setInterval(() => { if (done) clearInterval(iv); else ch.postMessage({ from: role, hi: 1 }); }, 200);
    });
  }

  // sessione host-autoritativa: passo fisso, istantanee ogni sendEvery passi, interpolazione con ~100 ms di ritardo
  function session(link, o) {
    const tick = o.tick || 30, dtMs = 1000 / tick, every = o.sendEvery || 2, delay = o.delay === undefined ? 100 : o.delay;
    const host = link.role === 'host';
    const hs = { event: [] };
    let running = false, acc = 0, last = null, n = 0, local = null, remote = null, buf = [], off = null, pingAt = 0;
    const stats = { rtt: link.rtt || 0, lost: 0, tick: 0 };
    const clock = () => (G.performance ? G.performance.now() : Date.now());
    link.on('message', (m) => {
      if (!m || !m._mp) return;
      if (m._mp === 'in') { if (!remote || m.n >= remote.n) remote = m; }
      else if (m._mp === 'sn') {
        if (buf.length && m.n <= buf[buf.length - 1].n - 30) return;
        buf.push(m); buf.sort((x, y) => x.n - y.n); if (buf.length > 30) buf.shift();
        const o2 = m.n * dtMs - (S._now || 0);
        off = off === null ? o2 : Math.max(o2, off + (o2 - off) * 0.05);
      } else if (m._mp === 'ev') for (const cb of hs.event) cb(m.e);
      else if (m._mp === 'pi') link.send({ _mp: 'po', t: m.t }, { reliable: false });
      else if (m._mp === 'po') { stats.rtt = link.rtt = Math.max(0, (S._now || clock()) - m.t); link._emit && link._emit('rtt', stats.rtt); }
    });
    const S = {
      stats, _now: 0,
      setInput(i) { local = i; },
      start() { running = true; last = null; },
      stop() { running = false; },
      on(type, cb) { (hs[type] = hs[type] || []).push(cb); },
      event(obj) { link.send({ _mp: 'ev', e: obj }, { reliable: true }); },
      frame(now) {
        S._now = now;
        if (!running) return;
        if (last === null) last = now;
        acc += Math.min(250, Math.max(0, now - last)); last = now;
        if (now - pingAt > 500) { pingAt = now; link.send({ _mp: 'pi', t: now }, { reliable: false }); }
        while (acc >= dtMs) {
          acc -= dtMs; n++; stats.tick = n;
          if (host) {
            o.step(dtMs / 1000, [local, remote ? remote.i : null]);
            if (n % every === 0) link.send({ _mp: 'sn', n, d: o.snapshot() }, { reliable: false });
          } else {
            if (o.predict) o.predict(dtMs / 1000, local);
            if (n % 2 === 0) link.send({ _mp: 'in', n, i: local }, { reliable: false });
          }
        }
        if (!host && buf.length && o.apply) {
          const rt = now + off - delay;
          let i = buf.length - 1;
          while (i > 0 && buf[i - 1].n * dtMs > rt) i--;
          // buf[i] = la prima istantanea dopo il tempo da mostrare (o l'ultima); alpha tra la precedente e questa
          const b = buf[i], a = i > 0 ? buf[i - 1] : null;
          const alpha = a ? Math.max(0, Math.min(1, (rt - a.n * dtMs) / ((b.n - a.n) * dtMs))) : 1;
          if (i > 2) buf.splice(0, i - 2);
          o.apply(b.d, alpha);
        }
      },
    };
    return S;
  }

  HH.mp = { pair, loopback, session, stub: true };
})(typeof globalThis !== 'undefined' ? globalThis : window);
