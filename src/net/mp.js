/* HH.mp — multigiocatore in rete locale per i giochi di Hari (contratto v1, vedi docs/multiplayer.md).
 * Nessun server e nessuna libreria: WebRTC DataChannel tra i due telefoni con i soli candidati "host" della LAN
 * (niente STUN/TURN: iceServers vuoto). L'offerta e la risposta viaggiano col suono (sonic.js), col QR (qr.js) o
 * con un codice da copiare; il dialogo è in mp-ui.js (HH.mp.pair).
 *
 *   Payload binario (offerta o risposta, ~39 byte con un indirizzo IPv4):
 *     HH.mp.pack(sdp, type, game) → Uint8Array      HH.mp.unpack(bytes) → { type, game, fp, cands, ufrag, pwd, sdp }
 *     HH.mp.toCode(bytes) / fromCode(str)           codice testuale "HH…" (base64url + CRC-16)
 *     HH.mp.toQr(bytes) / fromQr(str)               testo alfanumerico per il QR ("HH:" + base45)
 *   Trasporto:
 *     HH.mp.peer(role, { game, name, avatar }) → { offer(), accept(bytes), answer(bytes), opened: Promise<Link>, fruits, close() }
 *     HH.mp.loopback({ latency, jitter, loss, seed }) → [hostLink, guestLink]
 *     Link = { role, peer, rtt, open, send(msg, { reliable }), on(type, cb), off(type, cb), close(), channel(name), stats }
 *   Sessione host-autoritativa:
 *     HH.mp.session(link, { tick, sendEvery, delay, step, snapshot, apply, predict }) → Session
 *   Utilità: HH.mp.sas(fpA, fpB) → Promise<[4 frutti]> · diff/patch/quant · lerp(a, b, k)
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const now = () => (G.performance ? G.performance.now() : Date.now());

  /* ---------- base64 ---------- */
  const B64U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const B64S = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function b64(bytes, A = B64U) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0), k = bytes.length - i;
      s += A[(n >> 18) & 63] + A[(n >> 12) & 63] + (k > 1 ? A[(n >> 6) & 63] : '') + (k > 2 ? A[n & 63] : '');
    }
    return s;
  }
  function unb64(s, A = B64U) {
    const out = [];
    let buf = 0, bits = 0;
    for (const ch of s) {
      const v = A.indexOf(ch);
      if (v < 0) throw new Error('mp: codice non valido');
      buf = ((buf << 6) | v) & 0xffffff; bits += 6;
      if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); }
    }
    return Uint8Array.from(out);
  }
  function crc16(b) {
    if (HH.sonic) return HH.sonic.crc16(b);
    let c = 0xffff;
    for (let i = 0; i < b.length; i++) { c ^= b[i] << 8; for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff; }
    return c;
  }
  // 8 bit dal nome del gioco: chi si unisce a un altro gioco lo scopre subito
  const gameTag = (g) => { let h = 0x811c9dc5; for (const c of String(g || '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 255; };

  /* ---------- SDP ↔ payload compatto ---------- */
  function parseSdp(sdp) {
    const get = (re) => { const m = sdp.match(re); return m ? m[1].trim() : null; };
    const fp = get(/a=fingerprint:sha-256 ([0-9A-Fa-f:]+)/i);
    const cands = [];
    for (const m of sdp.matchAll(/a=candidate:\S+ (\d+) (\w+) (\d+) (\S+) (\d+) typ (\w+)/g)) {
      if (m[1] !== '1' || m[2].toLowerCase() !== 'udp' || m[6] !== 'host') continue;
      cands.push({ addr: m[4], port: +m[5], prio: +m[3] });
    }
    return { ufrag: get(/a=ice-ufrag:(\S+)/), pwd: get(/a=ice-pwd:(\S+)/), fp: fp ? fp.split(':').map((h) => parseInt(h, 16)) : null, setup: get(/a=setup:(\w+)/) || 'actpass', cands };
  }
  // credenziali ICE ricavate dall'impronta (ufrag 4 caratteri, pwd 24: minimi ICE 4 e 22): 0 byte nel payload
  const credsFrom = (fp) => ({ ufrag: b64(fp.slice(0, 3), B64S), pwd: b64(fp.slice(3, 21), B64S) });
  function mungeCreds(sdp) {
    const p = parseSdp(sdp);
    if (!p.fp) return sdp;
    const c = credsFrom(p.fp);
    return sdp.replace(/a=ice-ufrag:\S+/g, 'a=ice-ufrag:' + c.ufrag).replace(/a=ice-pwd:\S+/g, 'a=ice-pwd:' + c.pwd);
  }
  const UUID = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\.local$/i;
  function addrBytes(a) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(a)) return [0, a.split('.').map(Number)];
    const u = a.match(UUID);
    if (u) return [2, u.slice(1).join('').match(/../g).map((h) => parseInt(h, 16))];
    if (a.includes(':')) {
      const [l, r] = a.split('::'), L = l ? l.split(':') : [], R = r != null ? (r ? r.split(':') : []) : [];
      if (r == null && L.length !== 8) return null;
      const all = [...L, ...new Array(8 - L.length - R.length).fill('0'), ...R];
      if (all.length !== 8 || all.some((x) => !/^[0-9a-f]{1,4}$/i.test(x))) return null;
      if (/^fe80/i.test(all[0])) return null; // link-local: servirebbe lo scope
      return [1, all.flatMap((x) => { const n = parseInt(x, 16); return [n >> 8, n & 255]; })];
    }
    return null;
  }
  function bytesAddr(kind, b) {
    if (kind === 0) return Array.from(b).join('.');
    if (kind === 2) { const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}.local`; }
    const g = [];
    for (let i = 0; i < 16; i += 2) g.push(((b[i] << 8) | b[i + 1]).toString(16));
    return g.join(':');
  }
  /* Formato v1:
   *   [0]   vv t c s nnn   vv = versione (1) · t = 0 offerta / 1 risposta · c = credenziali esplicite · s = setup passive
   *                        nnn = quanti candidati IPv4 (host, UDP)
   *   [1]   etichetta del gioco (8 bit)
   *   [2..33] impronta SHA-256 del certificato DTLS
   *   (se c) ulen, ufrag, plen, pwd in ASCII
   *   nnn × (4 byte IPv4 + 2 byte porta)
   *   quel che resta: k × (tipo 1 = IPv6 | 2 = mDNS, 16 byte, 2 byte porta)   (solo se mancano gli IPv4) */
  function pack(sdp, type, game, o = {}) {
    const p = parseSdp(sdp);
    if (!p.ufrag || !p.pwd || !p.fp || p.fp.length !== 32) throw new Error('mp: SDP non supportato');
    const d = credsFrom(p.fp), explicit = p.ufrag !== d.ufrag || p.pwd !== d.pwd;
    const all = p.cands.map((c) => ({ c, a: addrBytes(c.addr) })).filter((x) => x.a);
    const seen = new Set(), v4 = [], other = [];
    for (const x of all) {
      const key = x.c.addr + ':' + x.c.port;
      if (seen.has(key)) continue;
      seen.add(key);
      (x.a[0] === 0 ? v4 : other).push(x);
    }
    const n4 = v4.slice(0, o.max4 || 4), ext = n4.length ? [] : other.sort((a, b) => a.a[0] - b.a[0]).slice(0, 2);
    const out = [(1 << 6) | ((type === 'answer' ? 1 : 0) << 5) | ((explicit ? 1 : 0) << 4) | ((p.setup === 'passive' ? 1 : 0) << 3) | n4.length, gameTag(game), ...p.fp];
    if (explicit) for (const s of [p.ufrag, p.pwd]) { out.push(s.length); for (const ch of s) out.push(ch.charCodeAt(0) & 127); }
    for (const { c, a } of n4) out.push(...a[1], c.port >> 8, c.port & 255);
    for (const { c, a } of ext) out.push(a[0], ...a[1], c.port >> 8, c.port & 255);
    return Uint8Array.from(out);
  }
  function unpack(b) {
    if (!b || b.length < 34 || b[0] >> 6 !== 1) throw new Error('mp: codice sconosciuto');
    let i = 0;
    const h = b[i++], type = (h >> 5) & 1 ? 'answer' : 'offer', explicit = (h >> 4) & 1, n4 = h & 7;
    const setup = type === 'offer' ? 'actpass' : (h >> 3) & 1 ? 'passive' : 'active';
    const game = b[i++], fp = Array.from(b.slice(i, i + 32)); i += 32;
    let { ufrag, pwd } = credsFrom(fp);
    if (explicit) {
      const str = () => { const n = b[i++]; if (i + n > b.length) throw new Error('mp: codice rovinato'); const s = String.fromCharCode(...b.slice(i, i + n)); i += n; return s; };
      ufrag = str(); pwd = str();
    }
    const cands = [];
    for (let k = 0; k < n4; k++) { if (i + 6 > b.length) throw new Error('mp: codice rovinato'); cands.push({ addr: bytesAddr(0, b.slice(i, i + 4)), port: (b[i + 4] << 8) | b[i + 5] }); i += 6; }
    while (i + 19 <= b.length) { const kind = b[i]; cands.push({ addr: bytesAddr(kind, b.slice(i + 1, i + 17)), port: (b[i + 17] << 8) | b[i + 18] }); i += 19; }
    if (i !== b.length) throw new Error('mp: codice rovinato');
    const fps = fp.map((x) => x.toString(16).toUpperCase().padStart(2, '0')).join(':');
    const sid = String(1e15 + ((fp[0] << 16 | fp[1] << 8 | fp[2]) >>> 0)).slice(0, 16);
    const lines = ['v=0', `o=- ${sid} 2 IN IP4 127.0.0.1`, 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0'];
    cands.forEach((c, k) => lines.push(`a=candidate:${k + 1} 1 udp ${2122260223 - k * 256} ${c.addr} ${c.port} typ host generation 0`));
    lines.push(`a=ice-ufrag:${ufrag}`, `a=ice-pwd:${pwd}`, 'a=ice-options:trickle', `a=fingerprint:sha-256 ${fps}`, `a=setup:${setup}`,
      'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144');
    return { type, game, fp, cands, ufrag, pwd, setup, sdp: lines.join('\r\n') + '\r\n' };
  }
  function toCode(bytes) { const c = crc16(bytes); return 'HH' + b64(Array.from(bytes).concat([c >> 8, c & 255])); }
  function fromCode(s) {
    const m = String(s || '').replace(/\s+/g, '').match(/HH([A-Za-z0-9_-]{40,})/);
    if (!m) throw new Error('mp: codice non valido');
    const b = unb64(m[1]), d = b.slice(0, -2);
    if (crc16(d) !== ((b[b.length - 2] << 8) | b[b.length - 1])) throw new Error('mp: codice rovinato');
    return d;
  }
  const toQr = (bytes) => 'HH:' + HH.qr.base45.encode(bytes);
  function fromQr(s) { if (!/^HH:/.test(s || '')) throw new Error('mp: QR di un altro gioco'); return HH.qr.base45.decode(s.slice(3)); }

  /* ---------- codice di conferma: 4 frutti dalle due impronte DTLS ---------- */
  const FRUITS = ['🍓', '🍒', '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍑', '🥭', '🍍', '🥝', '🥥', '🫐'];
  async function sas(fpA, fpB) {
    const hex = (f) => (Array.isArray(f) || ArrayBuffer.isView(f) ? Array.from(f, (x) => x.toString(16).padStart(2, '0')).join('') : String(f).replace(/:/g, '').toLowerCase());
    const [a, b] = [hex(fpA), hex(fpB)].sort();
    const sub = G.crypto && G.crypto.subtle;
    if (!sub) throw new Error('mp: crypto.subtle non disponibile');
    const h = new Uint8Array(await sub.digest('SHA-256', new TextEncoder().encode('hari-sas-v1|' + a + '|' + b)));
    return [h[0] >> 4, h[0] & 15, h[1] >> 4, h[1] & 15].map((k) => FRUITS[k]);
  }

  /* ---------- delta strutturali ---------- */
  const q3 = (v) => (typeof v === 'number' ? (Number.isFinite(v) ? Math.round(v * 1000) / 1000 || 0 : 0) : v);
  function quant(v) {
    if (Array.isArray(v)) return v.map(quant);
    if (v && typeof v === 'object') { const o = {}; for (const k in v) if (v[k] !== undefined) o[k] = quant(v[k]); return o; }
    return q3(v);
  }
  // {$:v} sostituisci · {'~':1} togli · {'#':n} nuova lunghezza di un array · sotto-oggetti = cambi annidati
  function diff(a, b) {
    if (a === b) return undefined;
    const ao = a && typeof a === 'object', bo = b && typeof b === 'object';
    if (!ao || !bo || Array.isArray(a) !== Array.isArray(b)) return { $: b };
    const out = {};
    let any = false;
    if (Array.isArray(b)) {
      if (a.length !== b.length) { out['#'] = b.length; any = true; }
      for (let i = 0; i < b.length; i++) { const d = i < a.length ? diff(a[i], b[i]) : { $: b[i] }; if (d !== undefined) { out[i] = d; any = true; } }
    } else {
      for (const k in b) { const d = k in a ? diff(a[k], b[k]) : { $: b[k] }; if (d !== undefined) { out[k] = d; any = true; } }
      for (const k in a) if (!(k in b)) { out[k] = { '~': 1 }; any = true; }
    }
    return any ? out : undefined;
  }
  function patch(a, p) {
    if (p === undefined) return a;
    if ('$' in p) return p.$;
    if (Array.isArray(a)) {
      const n = '#' in p ? p['#'] : a.length, out = a.slice(0, n);
      for (const k in p) if (k !== '#') out[+k] = patch(a[+k], p[k]);
      return out;
    }
    const out = Object.assign({}, a);
    for (const k in p) { if (p[k] && p[k]['~']) delete out[k]; else out[k] = patch(a ? a[k] : undefined, p[k]); }
    return out;
  }
  // interpolazione numerica profonda (i campi non numerici vengono dal più recente)
  function lerp(a, b, k) {
    if (typeof b === 'number') return typeof a === 'number' ? a + (b - a) * k : b;
    if (Array.isArray(b)) return b.map((x, i) => lerp(Array.isArray(a) ? a[i] : undefined, x, k));
    if (b && typeof b === 'object') { const o = {}; for (const key in b) o[key] = lerp(a && typeof a === 'object' ? a[key] : undefined, b[key], k); return o; }
    return b;
  }

  /* ---------- Link: lo stesso su WebRTC e in memoria ---------- */
  // transport = { send(str, reliable) → bool, close() }; il trasporto chiama link._recv(str) e link._down(reason)
  // Trame: m messaggio · c canale interno · h saluto (nome) · p/q ping/pong · s conferma frutti · b ciao
  function makeLink(role, transport, me) {
    const hs = {}, chans = {};
    let open = true, lastRx = now(), pingT = 0, sasMine = null, sasTheirs = null, sasWait = [];
    const emit = (t, ...a) => (hs[t] || []).slice().forEach((f) => { try { f(...a); } catch (e) { if (G.console) G.console.error(e); } });
    const raw = (s, rel) => { if (!open) return false; link.stats.out++; link.stats.bytesOut += s.length; return transport.send(s, rel); };
    const link = {
      role, peer: { name: '', avatar: '' }, rtt: 0, stats: { out: 0, in: 0, bytesOut: 0, bytesIn: 0 },
      get open() { return open; },
      send(msg, o = {}) { return raw('m' + JSON.stringify(msg), o.reliable !== false); },
      on(t, cb) { (hs[t] = hs[t] || []).push(cb); return link; },
      off(t, cb) { hs[t] = (hs[t] || []).filter((f) => f !== cb); return link; },
      // canale con nome (lo usa la sessione): i suoi messaggi non arrivano agli ascoltatori di 'message'
      channel(name) {
        const c = chans[name] || (chans[name] = { hs: [] });
        return {
          send: (msg, o = {}) => raw('c' + name + '\u0001' + JSON.stringify(msg), o.reliable !== false),
          on: (cb) => { c.hs.push(cb); },
        };
      },
      // conferma dei frutti: risolve true quando entrambi hanno detto sì, false al primo no
      confirm(ok) {
        sasMine = !!ok;
        raw('s' + (ok ? 1 : 0), true);
        return new Promise((res) => { sasWait.push(res); checkSas(); });
      },
      close(why = 'local') { if (!open) return; raw('b', true); down(why); },
      _recv(s) {
        if (!open || typeof s !== 'string' || !s) return;
        lastRx = now(); link.stats.in++; link.stats.bytesIn += s.length;
        const k = s[0], body = s.slice(1);
        if (k === 'm') { let m; try { m = JSON.parse(body); } catch (e) { return; } emit('message', m); }
        else if (k === 'c') { const j = body.indexOf('\u0001'), c = chans[body.slice(0, j)]; if (c) { let m; try { m = JSON.parse(body.slice(j + 1)); } catch (e) { return; } c.hs.forEach((f) => f(m)); } }
        else if (k === 'p') raw('q' + body, false);
        else if (k === 'q') { const r = Math.max(0, now() - +body); link.rtt = link.rtt ? link.rtt * 0.75 + r * 0.25 : r; emit('rtt', link.rtt); }
        else if (k === 'h') { try { const p = JSON.parse(body); link.peer = { name: String(p.name || '').slice(0, 24), avatar: String(p.avatar || '').slice(0, 24) }; emit('hello', link.peer); } catch (e) { /* saluto rovinato */ } }
        else if (k === 's') { sasTheirs = body === '1'; checkSas(); }
        else if (k === 'b') down('remote');
      },
      _down: (why) => down(why),
    };
    function checkSas() {
      if (sasMine === false || sasTheirs === false) { const w = sasWait; sasWait = []; w.forEach((f) => f(false)); }
      else if (sasMine && sasTheirs) { const w = sasWait; sasWait = []; w.forEach((f) => f(true)); }
    }
    function down(why) {
      if (!open) return;
      open = false;
      clearInterval(pingT);
      if (sasTheirs == null) sasTheirs = false;
      checkSas();
      try { transport.close(); } catch (e) { /* già chiuso */ }
      emit('close', why);
    }
    pingT = setInterval(() => {
      raw('p' + now().toFixed(1), false);
      if (now() - lastRx > (link.timeout || 6000)) down('lost');
    }, 1000);
    if (pingT && pingT.unref) pingT.unref();
    raw('h' + JSON.stringify(me || {}), true);
    return link;
  }

  /* ---------- loopback in memoria (test e sviluppo) ---------- */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function loopback(o = {}) {
    const lat = o.latency != null ? o.latency : 40, jit = o.jitter != null ? o.jitter : 10, loss = o.loss || 0;
    const rnd = o.rnd || (o.seed != null ? rng(o.seed) : Math.random);
    const ends = [], lastRel = [0, 0];
    let alive = true;
    const pending = new Set();
    const mk = (side) => ({
      send(s, rel) {
        if (!alive) return false;
        if (!rel && rnd() < loss) return true;
        let at = now() + Math.max(0, lat + (rnd() * 2 - 1) * jit);
        // affidabile = mai perso e in ordine (come SCTP ordinato)
        if (rel) { at = Math.max(at, lastRel[side] + 0.01); lastRel[side] = at; }
        const t = setTimeout(() => { pending.delete(t); const dst = ends[1 - side]; if (dst) dst._recv(s); }, Math.max(0, at - now()));
        pending.add(t);
        return true;
      },
      close() {
        if (!alive) return;
        alive = false;
        // il "ciao" (già in coda) arriva comunque; poi l'altro capo si chiude
        setTimeout(() => { const dst = ends[1 - side]; if (dst) dst._down('remote'); }, lat + jit + 5);
      },
    });
    ends[0] = makeLink('host', mk(0), o.host || { name: 'Hari', avatar: 'hedgehog' });
    ends[1] = makeLink('guest', mk(1), o.guest || { name: 'Kiki', avatar: 'squirrel' });
    ends[0].peer = Object.assign({}, o.guest || { name: 'Kiki', avatar: 'squirrel' });
    ends[1].peer = Object.assign({}, o.host || { name: 'Hari', avatar: 'hedgehog' });
    return [ends[0], ends[1]];
  }

  /* ---------- WebRTC ---------- */
  function waitGather(pc, ms) {
    return new Promise((res) => {
      if (pc.iceGatheringState === 'complete') return res();
      const t = setTimeout(res, ms);
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
    });
  }
  async function setLocal(pc, desc) {
    // credenziali ICE ricavate dall'impronta (0 byte da cantare); se il browser rifiuta, si mandano esplicite
    try { await pc.setLocalDescription({ type: desc.type, sdp: mungeCreds(desc.sdp) }); }
    catch (e) { await pc.setLocalDescription(desc); }
  }
  function peer(role, o = {}) {
    const RTC = G.RTCPeerConnection;
    if (!RTC) { const e = new Error('nortc'); e.code = 'nortc'; throw e; }
    const pc = new RTC({ iceServers: o.iceServers || [] });
    const rel = pc.createDataChannel('rel', { negotiated: true, id: 0, ordered: true });
    const un = pc.createDataChannel('un', { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 });
    let localFp = null, remoteFp = null, link = null, closed = false, resolveOpen, rejectOpen;
    const opened = new Promise((res, rej) => { resolveOpen = res; rejectOpen = rej; });
    opened.catch(() => {});
    const me = { name: o.name || '', avatar: o.avatar || '' };
    const transport = {
      send(s, reliable) {
        const ch = reliable || un.readyState !== 'open' ? rel : un;
        if (ch.readyState !== 'open') return false;
        if (!reliable && un.bufferedAmount > 65536) return false; // meglio perdere un'istantanea che accumulare ritardo
        try { ch.send(s); return true; } catch (e) { return false; }
      },
      close() { setTimeout(() => { try { pc.close(); } catch (e) { /* già chiuso */ } }, 150); },
    };
    rel.onopen = async () => {
      let fruits = null;
      try { fruits = await sas(localFp, remoteFp); } catch (e) { fruits = null; }
      api.fruits = fruits;
      link = makeLink(role, transport, me);
      api.link = link;
      resolveOpen(link);
    };
    rel.onmessage = (e) => link && link._recv(e.data);
    un.onmessage = (e) => link && link._recv(e.data);
    rel.onclose = () => { if (link) link._down('lost'); else fail('closed'); };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'failed' || s === 'closed') { if (link) link._down('lost'); else fail(s); }
    };
    function fail(why) { if (closed) return; closed = true; const e = new Error(why); e.code = why; rejectOpen(e); try { pc.close(); } catch (er) { /* già chiuso */ } }
    const local = async () => { await waitGather(pc, o.gatherMs || 2500); const d = pc.localDescription.sdp; localFp = parseSdp(d).fp; return pack(d, role === 'host' ? 'offer' : 'answer', o.game); };
    const api = {
      role, pc, opened, fruits: null, link: null,
      get localFp() { return localFp; }, get remoteFp() { return remoteFp; },
      // host: l'offerta da cantare
      async offer() { await setLocal(pc, await pc.createOffer()); return local(); },
      // ospite: riceve l'offerta, restituisce la risposta
      async accept(bytes) {
        const x = unpack(bytes);
        if (x.type !== 'offer') throw Object.assign(new Error('notoffer'), { code: 'notoffer' });
        if (o.game != null && x.game !== gameTag(o.game)) throw Object.assign(new Error('othergame'), { code: 'othergame' });
        remoteFp = x.fp;
        await pc.setRemoteDescription({ type: 'offer', sdp: x.sdp });
        await setLocal(pc, await pc.createAnswer());
        return local();
      },
      // host: riceve la risposta
      async answer(bytes) {
        const x = unpack(bytes);
        if (x.type !== 'answer') throw Object.assign(new Error('notanswer'), { code: 'notanswer' });
        if (o.game != null && x.game !== gameTag(o.game)) throw Object.assign(new Error('othergame'), { code: 'othergame' });
        if (remoteFp) return; // risposta già ricevuta (la canzone si ripete)
        remoteFp = x.fp;
        await pc.setRemoteDescription({ type: 'answer', sdp: x.sdp });
      },
      close() { if (link) link.close(); else fail('cancel'); },
    };
    return api;
  }

  /* ---------- sessione host-autoritativa ---------- */
  function session(link, o) {
    const hz = o.tick || 30, dt = 1 / hz, dtMs = 1000 / hz, every = o.sendEvery || 2, delay = o.delay != null ? o.delay : 100;
    const host = link.role === 'host', ch = link.channel('s'), hs = {};
    const emit = (t, ...a) => (hs[t] || []).slice().forEach((f) => { try { f(...a); } catch (e) { if (G.console) G.console.error(e); } });
    const stats = { rtt: 0, lost: 0, tick: 0, bytes: 0, maxBytes: 0, full: 0, delta: 0 };
    let running = false, last = 0, acc = 0, tickN = 0, myInput = null;
    // eventi affidabili: numerati, consegnati una volta sola e in ordine
    let evOut = 0, evIn = 0;
    const evHold = new Map();
    // host
    const hist = new Map();
    let acked = -1, ackedAt = 0, inSeq = 0, inLatest = null, inUsed = 0, lastRelFull = -1e9;
    const inBuf = new Map();
    // ospite
    const have = new Map(), buf = [];
    let mySeq = 0, myHist = [], latestTick = -1, offs = [], lastSnapAt = 0;

    function onMsg(m) {
      if (!m || typeof m !== 'object') return;
      if (m.k === 'e') {
        if (m.n <= evIn || evHold.has(m.n)) return;
        evHold.set(m.n, m);
        while (evHold.has(evIn + 1)) { const e = evHold.get(evIn + 1); evHold.delete(evIn + 1); evIn++; emit('event', e.e, { tick: e.t }); }
        return;
      }
      if (host && m.k === 'i') {
        if (m.a > acked && hist.has(m.a)) { acked = m.a; ackedAt = now(); }
        for (const [q, inp] of m.i || []) if (q > inUsed && !inBuf.has(q)) inBuf.set(q, inp);
        if (m.q > inSeq) { if (inSeq && m.q > inSeq + 3) stats.lost += m.q - inSeq - 3; inSeq = m.q; }
        return;
      }
      if (!host && m.k === 's') {
        if (have.has(m.t)) return;
        let st;
        if (m.b < 0) st = m.d;
        else { const base = have.get(m.b); if (!base) { stats.lost++; return; } st = patch(base, m.d); }
        have.set(m.t, st);
        for (const k of have.keys()) if (k < m.t - 90) have.delete(k);
        if (latestTick >= 0 && m.t > latestTick + every) stats.lost += Math.round((m.t - latestTick) / every) - 1;
        if (m.t > latestTick) latestTick = m.t;
        const at = now();
        lastSnapAt = at;
        offs.push([at, at - m.t * dtMs]);
        while (offs.length && offs[0][0] < at - 3000) offs.shift();
        buf.push({ t: m.t, s: st });
        buf.sort((a, b) => a.t - b.t);
        while (buf.length > 40) buf.shift();
        emit('snapshot', st, m.t);
      }
    }
    ch.on(onMsg);
    link.on('close', (why) => { running = false; emit('close', why); });

    // input dell'ospite per questo tick: il più recente, con i "pressi" brevi saltati che restano veri per un tick
    function guestInput() {
      const keys = [...inBuf.keys()].sort((a, b) => a - b);
      if (keys.length) {
        const latest = inBuf.get(keys[keys.length - 1]);
        let merged = latest;
        if (latest && typeof latest === 'object' && !Array.isArray(latest)) {
          merged = Object.assign({}, latest);
          for (const k of keys.slice(0, -1)) {
            const v = inBuf.get(k);
            if (v && typeof v === 'object') for (const f in v) if ((v[f] === true || v[f] === 1) && !merged[f]) merged[f] = v[f];
          }
        }
        inLatest = latest;
        inUsed = keys[keys.length - 1];
        inBuf.clear();
        return merged;
      }
      return inLatest;
    }
    function hostTick() {
      tickN++;
      o.step(dt, [myInput, guestInput()]);
      if (tickN % every === 0) {
        const snap = quant(o.snapshot());
        hist.set(tickN, snap);
        for (const k of hist.keys()) if (k < tickN - 90) hist.delete(k);
        const base = acked > 0 && hist.has(acked) && now() - ackedAt < 2000 ? acked : -1;
        const msg = base < 0 ? { k: 's', t: tickN, b: -1, d: snap } : { k: 's', t: tickN, b: base, d: diff(hist.get(base), snap) || {} };
        if (base < 0) stats.full++; else stats.delta++;
        const len = JSON.stringify(msg).length;
        stats.bytes += len;
        stats.maxBytes = Math.max(stats.maxBytes, len);
        // un'istantanea completa grande (> ~1 pacchetto) va sul canale affidabile: sul non affidabile basterebbe perdere
        // un frammento SCTP su cinque per perderla tutta, e senza base i delta non servono. Al massimo ogni 300 ms.
        const rel = base < 0 && len > 1100 && now() - lastRelFull > 300;
        if (rel) lastRelFull = now();
        ch.send(msg, { reliable: rel });
      }
    }
    function guestTick() {
      tickN++;
      mySeq++;
      myHist.push([mySeq, myInput]);
      if (myHist.length > 3) myHist.shift();
      ch.send({ k: 'i', q: mySeq, i: myHist.slice(), a: latestTick }, { reliable: false });
      if (o.predict) o.predict(dt, myInput);
    }
    function render(t) {
      if (!buf.length || !o.apply) return;
      let off = Infinity;
      for (const x of offs) if (x[1] < off) off = x[1];
      const rt = (t - off - delay) / dtMs;
      let i = buf.length - 1;
      while (i > 0 && buf[i - 1].t > rt) i--;
      // i = primo con t > rt (o l'ultimo)
      let B = buf[i], A = buf[Math.max(0, i - 1)];
      if (B.t <= rt) A = B;
      const alpha = A === B || B.t <= A.t ? 1 : Math.max(0, Math.min(1, (rt - A.t) / (B.t - A.t)));
      o.apply(B.s, alpha, A.s);
    }
    const S = {
      stats, role: link.role, link,
      setInput(inp) { myInput = inp; },
      start() { running = true; last = 0; },
      stop() { running = false; },
      get running() { return running; },
      on(t, cb) { (hs[t] = hs[t] || []).push(cb); return S; },
      off(t, cb) { hs[t] = (hs[t] || []).filter((f) => f !== cb); return S; },
      event(obj) { evOut++; ch.send({ k: 'e', n: evOut, e: obj, t: tickN }, { reliable: true }); },
      // ultima istantanea completa ricevuta (ospite), per chi non vuole interpolare
      get latest() { return latestTick >= 0 ? have.get(latestTick) : null; },
      frame(t = now()) {
        stats.rtt = link.rtt; stats.tick = tickN;
        if (!running) return;
        const d = last ? Math.min(250, t - last) : 0;
        last = t;
        acc += d;
        let n = 0;
        while (acc >= dtMs && n < 8) { acc -= dtMs; n++; if (host) hostTick(); else guestTick(); }
        if (acc > dtMs) acc = dtMs; // troppo indietro: si lascia perdere, niente spirale
        if (!host) render(t);
        stats.tick = tickN;
        stats.stale = host ? 0 : lastSnapAt ? t - lastSnapAt : 0;
      },
    };
    return S;
  }

  HH.mp = Object.assign(HH.mp && !HH.mp.stub ? HH.mp : {}, {
    VERSION: 1, pack, unpack, parseSdp, mungeCreds, credsFrom, gameTag, toCode, fromCode, toQr, fromQr,
    sas, FRUITS, diff, patch, quant, lerp, b64, unb64, loopback, peer, session, makeLink,
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
