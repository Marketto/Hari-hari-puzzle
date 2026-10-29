/* STUB di sviluppo di HH.mp (contratto v1, scratchpad/mp-contract.md) — NON è nel catalogo e non va in produzione.
 * Serve a provare Hari Snack Street a due prima che arrivi il modulo vero (worktree hh-mp):
 *   - HH.mp.loopback({ latency, jitter, loss }) → [hostLink, guestLink] in memoria (anche in Node, per i test)
 *   - HH.mp.session(link, opts) host-autoritativa: l'host fa i tick fissi e manda uno snapshot ogni sendEvery tick,
 *     l'ospite manda il proprio input a ogni tick e interpola tra gli ultimi due snapshot con ~100 ms di ritardo
 *   - HH.mp.pair({ game }) per Playwright: due pagine dello stesso browser collegate da BroadcastChannel; il ruolo si
 *     sceglie con HH.mpStubRole = 'host' | 'guest' (impostato dallo script di prova) — niente dialogo, niente WebRTC.
 * Se il modulo vero è già caricato, questo file non tocca nulla.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  if (HH.mp && !HH.mp.stub) return;
  const now = () => (G.performance ? G.performance.now() : Date.now());

  function makeLink(role, peer, transmit) {
    const hs = {};
    const link = {
      role, peer, rtt: 0, open: true,
      send(msg, o = {}) { if (link.open) transmit(JSON.stringify(msg), o.reliable !== false); },
      on(t, cb) { (hs[t] = hs[t] || []).push(cb); return link; },
      close(why = 'bye') { if (!link.open) return; link.open = false; transmit(JSON.stringify({ _close: why }), true); emit('close', why); },
      _recv(txt) {
        const m = JSON.parse(txt);
        if (m._close) { if (link.open) { link.open = false; emit('close', m._close); } return; }
        if (m._ping) { transmit(JSON.stringify({ _pong: m._ping }), false); return; }
        if (m._pong) { link.rtt = link.rtt ? link.rtt * 0.7 + (now() - m._pong) * 0.3 : now() - m._pong; emit('rtt', link.rtt); return; }
        emit('message', m);
      },
    };
    function emit(t, ...a) { (hs[t] || []).forEach((f) => f(...a)); }
    setTimeout(function ping() { if (!link.open) return; transmit(JSON.stringify({ _ping: now() }), false); setTimeout(ping, 1000); }, 300);
    return link;
  }

  function loopback(o = {}) {
    const lat = o.latency != null ? o.latency : 40, jit = o.jitter != null ? o.jitter : 10, loss = o.loss || 0;
    const rnd = o.rnd || Math.random;
    let a = null, b = null, lastA = 0, lastB = 0;
    // affidabile = ordinato e mai perso; non affidabile = può perdersi e arrivare fuori ordine
    const tx = (to, rel) => (txt) => {
      if (!rel && rnd() < loss) return;
      let d = lat + (rnd() * 2 - 1) * jit;
      // l'affidabile resta in ordine: mai prima del messaggio affidabile precedente
      if (rel) { const prev = to === 'b' ? lastB : lastA; d = Math.max(d, prev - now()); if (to === 'b') lastB = now() + d; else lastA = now() + d; }
      setTimeout(() => (to === 'b' ? b : a)._recv(txt), Math.max(0, d));
    };
    a = makeLink('host', { name: 'Kiki', avatar: 'squirrel' }, (txt, rel) => tx('b', rel)(txt));
    b = makeLink('guest', { name: 'Hari', avatar: 'hedgehog' }, (txt, rel) => tx('a', rel)(txt));
    return [a, b];
  }

  function session(link, o) {
    const tick = o.tick || 30, dt = 1 / tick, every = o.sendEvery || 2, delay = o.delay != null ? o.delay : 100;
    const hs = {};
    let running = false, acc = 0, last = 0, n = 0, myInput = null, remoteInput = null, buf = [], lost = 0, seq = 0, lastSeq = 0;
    const emit = (t, ...a) => (hs[t] || []).forEach((f) => f(...a));
    link.on('message', (m) => {
      if (m.k === 'ev') { emit('event', m.e); return; }
      if (link.role === 'host' && m.k === 'in') { if (m.q > seq) { seq = m.q; remoteInput = m.i; } return; }
      if (link.role === 'guest' && m.k === 'st') {
        if (m.q <= lastSeq) return;
        if (lastSeq && m.q > lastSeq + 1) lost += m.q - lastSeq - 1;
        lastSeq = m.q;
        buf.push({ t: m.t, at: now(), s: m.s });
        if (buf.length > 20) buf.shift();
      }
    });
    link.on('close', (why) => emit('close', why));
    const S = {
      stats: { rtt: 0, lost: 0, tick },
      setInput(inp) { myInput = inp; },
      start() { running = true; last = 0; },
      stop() { running = false; },
      event(obj) { link.send({ k: 'ev', e: obj }, { reliable: true }); },
      on(t, cb) { (hs[t] = hs[t] || []).push(cb); return S; },
      frame(t = now()) {
        S.stats.rtt = link.rtt; S.stats.lost = lost;
        if (!running) return;
        const d = last ? Math.min(0.25, (t - last) / 1000) : 0;
        last = t;
        acc += d;
        if (link.role === 'host') {
          while (acc >= dt) {
            acc -= dt; n++;
            o.step(dt, [myInput, remoteInput]);
            if (n % every === 0) link.send({ k: 'st', q: n / every, t, s: o.snapshot() }, { reliable: false });
          }
        } else {
          while (acc >= dt) {
            acc -= dt; n++;
            if (o.predict) o.predict(dt, myInput);
            link.send({ k: 'in', q: n, i: myInput }, { reliable: false });
          }
          if (!buf.length) return;
          // tempo dell'host stimato dal campione più recente, meno il ritardo di interpolazione
          const lastS = buf[buf.length - 1], rt = lastS.t + (t - lastS.at) - delay;
          let i = buf.length - 1;
          while (i > 0 && buf[i - 1].t > rt) i--;
          const B = buf[i], A = buf[Math.max(0, i - 1)];
          const alpha = A === B || B.t <= A.t ? 1 : Math.max(0, Math.min(1, (rt - A.t) / (B.t - A.t)));
          o.apply(B.s, alpha, A.s);
        }
      },
    };
    return S;
  }

  // Playwright: due pagine dello stesso browser via BroadcastChannel
  function pair(o = {}) {
    const role = HH.mpStubRole;
    if (!role || !G.BroadcastChannel) return Promise.resolve(null);
    return new Promise((resolve) => {
      const ch = new G.BroadcastChannel('hh-mp-stub-' + (o.game || 'game'));
      const me = Math.random().toString(36).slice(2);
      let link = null, other = null;
      const transmit = (txt) => ch.postMessage({ from: me, to: other, txt });
      ch.onmessage = (e) => {
        const m = e.data;
        if (m.from === me) return;
        if (!link) {
          if (m.hello && m.role !== role) {
            other = m.from;
            ch.postMessage({ hello: 1, role, from: me, to: other });
            link = makeLink(role, { name: role === 'host' ? 'Kiki' : 'Hari', avatar: role === 'host' ? 'squirrel' : 'hedgehog' }, transmit);
            resolve(link);
          }
          return;
        }
        if (m.to === me && m.txt) link._recv(m.txt);
      };
      const hello = () => { if (!link) { ch.postMessage({ hello: 1, role, from: me }); setTimeout(hello, 300); } };
      hello();
    });
  }

  HH.mp = { stub: true, loopback, session, pair };
})(typeof globalThis !== 'undefined' ? globalThis : window);
