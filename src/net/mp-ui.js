/* HH.mp.pair — dialogo kawaii di abbinamento per giocare in due sulla stessa rete (Wi-Fi di casa o hotspot), senza internet.
 *
 *   HH.mp.pair({ game, players: 2, title, name, avatar }) → Promise<Link | null>
 *
 * 1. "Gioca insieme": Ospita / Unisciti.
 * 2. Suono: l'host canta l'offerta (melodia di Hari, ~6,6 s) e ascolta; l'ospite ascolta, poi risponde cantando.
 *    Si ripete finché l'altro non risponde. Il permesso del microfono si chiede solo qui, dopo una spiegazione.
 * 3. QR di riserva: se l'host ha il suono spento (effetti disattivati, Web Audio sospeso), se non si sente (volume basso:
 *    l'host non sente la propria canzone), se manca il microfono o il permesso, o dopo troppi tentativi.
 *    L'host mostra il QR dell'offerta, l'ospite lo inquadra e mostra quello della risposta. In "Problemi?" c'è il codice testuale.
 * 4. I due schermi mostrano gli stessi 4 frutti (dalle impronte DTLS): "Sì, è uguale" su entrambi → Link.
 * Il dialogo si monta dentro l'elemento a schermo intero, se c'è, e lo segue se cambia.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const D = G.document;
  const label = (k, en) => { const v = HH.i18n && HH.i18n.t ? HH.i18n.t(k) : k; return v && v !== k ? v : en; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const now = () => (G.performance ? G.performance.now() : Date.now());
  const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);
  const T = {
    LISTEN_REPLY: 11500,   // l'host ascolta la risposta (preparazione dell'ospite + 6,6 s di canzone)
    GUEST_DEAF: 24000,     // l'ospite non sente niente: si passa al QR
    CONNECT: 16000,        // dalla risposta al canale aperto
    HOST_TRIES: 5, GUEST_TRIES: 4,
  };

  const audioOff = () => {
    const sfx = HH.audio && HH.audio.sfx;
    return !!(sfx && sfx.isMuted && sfx.isMuted());
  };
  const hari = () => (HH.mascot && HH.mascot.svg ? HH.mascot.svg({ cls: 'hari mp-hari-svg' }) : '<span class="mp-hari-emoji">🦔</span>');

  function pair(opts = {}) {
    if (!D) return Promise.resolve(null);
    return new Promise((resolve) => {
      const game = opts.game || 'game';
      const me = { name: opts.name || (HH.store && HH.store.get ? HH.store.get('mp:name', '') : '') || '', avatar: opts.avatar || 'hedgehog' };
      let role = null, p = null, offerP = null, offerBytes = null, answerBytes = null, lastOffer = null;
      let modem = null, scanner = null, done = false, tok = 0, gotAnswer = false, opened = false;
      let singing = false, heardSelf = false, resing = false, connectT = 0, deafT = 0;
      const musicWas = HH.music && HH.music.isOn ? HH.music.isOn() : false;
      if (musicWas && HH.music.setOn) HH.music.setOn(false); // la musica coprirebbe la canzone

      /* ---------- montaggio ---------- */
      const ov = D.createElement('div');
      ov.className = 'mp-ov';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = '<div class="mp-sheet"><div class="mp-body"></div></div>';
      const body = ov.querySelector('.mp-body');
      const host = () => D.fullscreenElement || D.webkitFullscreenElement || D.body;
      const mount = () => { const h = host(); if (ov.parentNode !== h) h.appendChild(ov); };
      mount();
      const onFs = () => mount();
      D.addEventListener('fullscreenchange', onFs);
      D.addEventListener('webkitfullscreenchange', onFs);
      const onKey = (e) => { if (e.key === 'Escape') cancel(); };
      D.addEventListener('keydown', onKey);

      function cleanup() {
        done = true; tok++;
        clearTimeout(connectT); clearTimeout(deafT);
        if (modem) { try { modem.close(); } catch (e) { /* già chiuso */ } modem = null; }
        if (scanner) { scanner.stop(); scanner = null; }
        D.removeEventListener('fullscreenchange', onFs);
        D.removeEventListener('webkitfullscreenchange', onFs);
        D.removeEventListener('keydown', onKey);
        if (musicWas && HH.music.setOn) HH.music.setOn(true);
        ov.classList.add('mp-out');
        setTimeout(() => ov.remove(), 220);
      }
      function finish(link) { if (done) return; cleanup(); resolve(link); }
      function cancel() { if (done) return; if (p) p.close(); finish(null); }

      /* ---------- schermate ---------- */
      function screen(cls, html, wire) {
        if (done) return;
        body.className = 'mp-body mp-' + cls;
        body.innerHTML = html;
        body.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); act(b.dataset.act, b); }));
        if (wire) wire(body);
        const f = body.querySelector('.mp-btn.main, .mp-btn');
        if (f && f.focus) try { f.focus({ preventScroll: true }); } catch (e) { /* vecchi browser */ }
      }
      const btn = (act, text, cls = '') => `<button type="button" class="mp-btn ${cls}" data-act="${act}">${text}</button>`;
      const cancelBtn = () => btn('cancel', esc(label('mp_cancel', 'Cancel')), 'ghost');
      const stage = (cls = '') => `<div class="mp-stage ${cls}" aria-hidden="true"><div class="mp-hari">${hari()}</div>` +
        '<span class="mp-note n1">♪</span><span class="mp-note n2">♫</span><span class="mp-note n3">♪</span><span class="mp-note n4">♬</span><span class="mp-note n5">♩</span></div>';
      const bar = () => '<div class="mp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div>';
      const level = () => '<div class="mp-level" aria-hidden="true"><i></i></div>';
      function trouble(extra = '') {
        return `<details class="mp-trouble"><summary>${esc(label('mp_trouble', 'Problems?'))}</summary><div class="mp-trouble-in">` +
          extra + btn('code', esc(label('mp_text_code', 'Use a text code')), 'ghost small') + '</div></details>';
      }
      function setBar(v) { const i = body.querySelector('.mp-bar i'); if (i) { i.style.width = Math.round(v * 100) + '%'; i.parentNode.setAttribute('aria-valuenow', Math.round(v * 100)); } }
      function setLevel(v) { const i = body.querySelector('.mp-level i'); if (i) i.style.width = Math.min(100, Math.round(Math.sqrt(v) * 260)) + '%'; }
      function say(t) { const s = body.querySelector('.mp-say'); if (s) s.textContent = t; }

      function choose() {
        tok++;
        screen('choose', stage() +
          `<h2 class="mp-title">${esc(opts.title || label('mp_title', 'Play together'))}</h2>` +
          `<p class="mp-say">${esc(label('mp_choose_hint', 'Both phones on the same Wi-Fi or hotspot. No internet needed!'))}</p>` +
          `<div class="mp-row">${btn('host', '<b>🏠</b> ' + esc(label('mp_host', 'Host')), 'main')}${btn('join', '<b>🤝</b> ' + esc(label('mp_join', 'Join')), 'main mint')}</div>` +
          cancelBtn());
      }
      function error(code) {
        tok++;
        if (modem) { modem.close(); modem = null; }
        if (scanner) { scanner.stop(); scanner = null; }
        const msg = {
          denied: label('mp_err_denied', 'No microphone, no problem: let\'s use the QR code.'),
          nocam: label('mp_err_nocam', 'The camera isn\'t available. Try the text code under "Problems?".'),
          timeout: label('mp_err_timeout', 'Hari couldn\'t reach your friend. Are you on the same Wi-Fi? Some guest networks keep phones apart.'),
          othergame: label('mp_err_othergame', 'Your friend is playing a different game!'),
          sas: label('mp_err_sas', 'The fruits didn\'t match. Let\'s start again!'),
          nortc: label('mp_err_nortc', 'This browser can\'t play together, sorry!'),
          code: label('mp_err_code', 'That code doesn\'t look right. Try again?'),
          lost: label('mp_err_lost', 'Oh no, the connection dropped.'),
        }[code] || label('mp_err_generic', 'Something went wrong. Let\'s try again!');
        screen('error', stage('oops') + `<p class="mp-say">${esc(msg)}</p>` +
          `<div class="mp-row">${btn('retry', esc(label('mp_retry', 'Try again')), 'main')}</div>` + cancelBtn());
      }

      /* ---------- collegamento ---------- */
      function newPeer() {
        if (p) { try { p.close(); } catch (e) { /* già chiuso */ } }
        try { p = HH.mp.peer(role, { game, name: me.name, avatar: me.avatar }); } catch (e) { error('nortc'); return false; }
        const mine = p;
        p.opened.then((link) => { if (mine === p && !done) onOpen(link); }).catch((e) => { if (mine === p && !done && !opened) error(e && e.code === 'cancel' ? 'generic' : 'timeout'); });
        return true;
      }
      function start(r) {
        role = r; gotAnswer = false; opened = false; lastOffer = null; answerBytes = null; offerBytes = null;
        if (!newPeer()) return;
        if (role === 'host') { offerP = p.offer().then((b) => (offerBytes = b)); offerP.catch(() => error('nortc')); }
        if (role === 'host' && audioOff()) return qrHost('muted');
        askMic();
      }
      async function askMic() {
        let state = 'prompt';
        try { if (G.navigator.permissions) state = (await G.navigator.permissions.query({ name: 'microphone' })).state; } catch (e) { /* non supportato */ }
        if (done) return;
        if (state === 'granted') return sound();
        if (state === 'denied') return role === 'host' ? qrHost('denied') : qrGuest('denied');
        screen('mic', stage('ears') +
          `<h2 class="mp-title">${esc(label('mp_mic_title', 'Hari wants to listen!'))}</h2>` +
          `<p class="mp-say">${esc(label('mp_mic_why', 'Hari sings a secret tune to the other phone and listens for the answer. The sound stays here: nothing is recorded or sent.'))}</p>` +
          `<div class="mp-row">${btn('mic-ok', '🎤 ' + esc(label('mp_mic_ok', 'OK, let\'s sing!')), 'main')}</div>` +
          btn(role === 'host' ? 'qr' : 'scan', esc(label('mp_use_qr', 'Use a QR code instead')), 'ghost') + cancelBtn());
      }
      function onFrame(bytes) {
        if (done || !bytes || !bytes.length) return;
        const type = (bytes[0] >> 5) & 1 ? 'answer' : 'offer';
        if (role === 'host') {
          if (type === 'offer') { if (same(bytes, offerBytes)) heardSelf = true; return; }
          handleAnswer(bytes);
        } else {
          if (type === 'answer') { if (same(bytes, answerBytes)) heardSelf = true; return; }
          handleOffer(bytes, 'sound');
        }
      }
      async function openModem() {
        if (modem) return modem;
        try {
          modem = await HH.sonic.open({
            onFrame,
            onDetect: () => { if (singing) heardSelf = true; else if (!done) body.classList.add('mp-hearing'); },
            onProgress: (v) => { if (!singing && !done && body.classList.contains('mp-listen')) setBar(v); },
            onFail: () => body.classList.remove('mp-hearing'),
            onLevel: (v) => setLevel(v),
          });
        } catch (e) {
          modem = null;
          if (!done) role === 'host' ? qrHost(e.code === 'nomic' ? 'nomic' : 'denied') : qrGuest(e.code === 'nomic' ? 'nomic' : 'denied');
          return null;
        }
        if (done) { modem.close(); modem = null; return null; }
        if (!modem.running) { modem.close(); modem = null; role === 'host' ? qrHost('muted') : qrGuest('muted'); return null; }
        return modem;
      }
      async function sound() {
        const my = ++tok;
        screen('wait', stage() + `<p class="mp-say">${esc(label('mp_getting_ready', 'Hari is warming up…'))}</p>` + cancelBtn());
        const m = await openModem();
        if (!m || my !== tok) return;
        if (role === 'host') soundHost(my); else soundGuest(my);
      }
      async function soundHost(my) {
        let offer;
        try { offer = await offerP; } catch (e) { return; }
        let miss = 0;
        for (let i = 0; i < T.HOST_TRIES && my === tok && !gotAnswer; i++) {
          screen('sing', stage('singing') +
            `<h2 class="mp-title">${esc(label('mp_singing_title', 'Hari is singing!'))}</h2>` +
            `<p class="mp-say">${esc(label('mp_singing', 'Hold the phones close together. Your friend taps "Join".'))}</p>` + bar() +
            `<p class="mp-hint mp-vol" ${miss ? '' : 'hidden'}>🔊 ${esc(label('mp_volume', 'Turn the volume up!'))}</p>` +
            trouble(btn('qr', esc(label('mp_use_qr', 'Use a QR code instead')), 'ghost small')) + cancelBtn());
          heardSelf = false; singing = true;
          await modem.send(offer, setBar);
          singing = false;
          await sleep(400);
          if (my !== tok || gotAnswer) return;
          if (!heardSelf) { miss++; if (miss >= 2) return qrHost('quiet'); }
          else miss = 0;
          screen('listen', stage('ears') +
            `<h2 class="mp-title">${esc(label('mp_listen_reply_title', 'Now Hari listens…'))}</h2>` +
            `<p class="mp-say">${esc(label('mp_listen_reply', 'Waiting for your friend\'s phone to sing back.'))}</p>` + level() + bar() +
            (miss ? `<p class="mp-hint mp-vol">🔊 ${esc(label('mp_volume', 'Turn the volume up!'))}</p>` : '') +
            trouble(btn('qr', esc(label('mp_use_qr', 'Use a QR code instead')), 'ghost small')) + cancelBtn());
          const t0 = now();
          while (my === tok && !gotAnswer && (now() - t0 < T.LISTEN_REPLY || (modem && modem.rx.busy))) await sleep(100);
        }
        if (my === tok && !gotAnswer) qrHost('nosound');
      }
      function soundGuest(my) {
        screen('listen', stage('ears') +
          `<h2 class="mp-title">${esc(label('mp_listening_title', 'Hari is listening…'))}</h2>` +
          `<p class="mp-say">${esc(label('mp_listening', 'Hold your phone near your friend\'s: their Hari is singing the code.'))}</p>` + level() + bar() +
          btn('scan', '📷 ' + esc(label('mp_scan_instead', 'Scan a QR code instead')), 'ghost') + trouble() + cancelBtn());
        clearTimeout(deafT);
        deafT = setTimeout(() => { if (my === tok && !lastOffer) qrGuest('nohear'); }, T.GUEST_DEAF);
      }
      async function handleOffer(bytes, via) {
        if (role !== 'guest' || opened) return;
        if (lastOffer && same(bytes, lastOffer)) { if (via === 'sound') resing = true; else if (answerBytes) showAnswer(via); return; }
        if (lastOffer && !newPeer()) return;
        lastOffer = bytes;
        clearTimeout(deafT);
        if (scanner) { scanner.stop(); scanner = null; }
        try { answerBytes = await p.accept(bytes); } catch (e) { return error(e && e.code === 'othergame' ? 'othergame' : 'code'); }
        if (done) return;
        armConnect();
        if (via === 'sound' && modem) singAnswer(++tok); else showAnswer(via);
      }
      async function singAnswer(my) {
        for (let i = 0; i < T.GUEST_TRIES && my === tok && !opened; i++) {
          screen('sing', stage('singing') +
            `<h2 class="mp-title">${esc(label('mp_answering_title', 'Got it! Singing back…'))}</h2>` +
            `<p class="mp-say">${esc(label('mp_answering', 'Keep the phones close: Hari is answering.'))}</p>` + bar() + cancelBtn());
          await sleep(350);
          if (my !== tok || opened) return;
          heardSelf = false; singing = true; resing = false;
          await modem.send(answerBytes, setBar);
          singing = false;
          if (my !== tok || opened) return;
          connecting();
          const t0 = now();
          while (my === tok && !opened && !resing && now() - t0 < 7500) await sleep(100);
        }
        if (my === tok && !opened) showAnswer('qr', 'nosound');
      }
      async function handleAnswer(bytes) {
        if (role !== 'host' || gotAnswer || opened) return;
        gotAnswer = true;
        if (modem) modem.stopSending();
        tok++;
        connecting();
        try { await p.answer(bytes); } catch (e) { gotAnswer = false; return error(e && e.code === 'othergame' ? 'othergame' : 'code'); }
        armConnect();
      }
      function armConnect() {
        clearTimeout(connectT);
        connectT = setTimeout(() => { if (!opened && !done && (role === 'host' ? gotAnswer : true)) error('timeout'); }, T.CONNECT + (role === 'guest' ? 60000 : 0));
      }
      function connecting() {
        screen('wait', stage('hop') + `<p class="mp-say">${esc(label('mp_connecting', 'Connecting the two phones…'))}</p><div class="mp-dots"><i></i><i></i><i></i></div>` + cancelBtn());
      }

      /* ---------- QR e codice ---------- */
      function qrSvg(bytes) { return HH.qr.svg(HH.qr.encode(HH.mp.toQr(bytes), { ecl: 'M' }), { margin: 3, cls: 'mp-qr', label: label('mp_qr_alt', 'QR code to scan') }); }
      async function qrHost(reason) {
        const my = ++tok;
        if (modem) { modem.close(); modem = null; }
        let offer;
        try { offer = await offerP; } catch (e) { return; }
        if (my !== tok) return;
        const why = { muted: label('mp_qr_muted', 'The sound is off, so let\'s use a QR code.'), quiet: label('mp_qr_quiet', 'Hari can\'t hear the song. Let\'s use a QR code.'),
          nosound: label('mp_qr_nosound', 'The song didn\'t get through. Let\'s use a QR code.'), denied: label('mp_err_denied', 'No microphone, no problem: let\'s use the QR code.'),
          nomic: label('mp_err_denied', 'No microphone, no problem: let\'s use the QR code.') }[reason] || '';
        screen('qr', (why ? `<p class="mp-hint">${esc(why)}</p>` : '') +
          `<p class="mp-say">${esc(label('mp_qr_show', 'Your friend taps "Join" and scans this code.'))}</p>` +
          `<div class="mp-qr-box">${qrSvg(offer)}</div>` +
          `<div class="mp-row">${btn('scan-answer', '📷 ' + esc(label('mp_qr_scan_reply', 'Scan your friend\'s code')), 'main')}</div>` +
          trouble() + cancelBtn());
      }
      function qrGuest(reason) {
        tok++;
        // il microfono resta acceso: se la canzone arriva mentre si inquadra, vince lei
        const why = { nohear: label('mp_qr_nohear', 'Hari can\'t hear the song. Scan your friend\'s QR code instead.'), denied: label('mp_err_denied', 'No microphone, no problem: let\'s use the QR code.'),
          nomic: label('mp_err_denied', 'No microphone, no problem: let\'s use the QR code.'), muted: label('mp_qr_muted', 'The sound is off, so let\'s use a QR code.') }[reason] || '';
        scan(why, label('mp_qr_point', 'Point the camera at the QR code on your friend\'s phone.'), (bytes) => handleOffer(bytes, 'qr'));
      }
      function scan(why, text, onBytes) {
        const my = ++tok;
        screen('scan', (why ? `<p class="mp-hint">${esc(why)}</p>` : '') + `<p class="mp-say">${esc(text)}</p>` +
          '<div class="mp-cam"><video muted playsinline></video><span class="mp-cam-frame"></span></div>' + trouble() + cancelBtn(), async (b) => {
          if (scanner) { scanner.stop(); scanner = null; }
          try {
            const s = await HH.qr.scan({
              video: b.querySelector('video'),
              onResult: (txt) => {
                let bytes;
                try { bytes = HH.mp.fromQr(txt); HH.mp.unpack(bytes); } catch (e) { say(label('mp_qr_wrong', 'That\'s a different QR code. Try your friend\'s!')); return false; }
                if (scanner) { scanner.stop(); scanner = null; }
                onBytes(bytes);
                return true;
              },
            });
            if (my !== tok || done) { s.stop(); return; }
            scanner = s;
          } catch (e) { if (my === tok) codeScreen(label('mp_err_nocam', 'The camera isn\'t available. Try the text code under "Problems?".')); }
        });
      }
      function showAnswer(via, reason) {
        tok++;
        if (modem) { modem.close(); modem = null; }
        if (via === 'code') return codeScreen();
        screen('qr', (reason === 'nosound' ? `<p class="mp-hint">${esc(label('mp_qr_nosound', 'The song didn\'t get through. Let\'s use a QR code.'))}</p>` : '') +
          `<p class="mp-say">${esc(label('mp_qr_answer', 'Now your friend scans this code.'))}</p>` +
          `<div class="mp-qr-box">${qrSvg(answerBytes)}</div><div class="mp-dots"><i></i><i></i><i></i></div>` + trouble() + cancelBtn());
      }
      async function codeScreen(note) {
        tok++;
        if (modem) { modem.close(); modem = null; }
        if (scanner) { scanner.stop(); scanner = null; }
        let mine = null;
        if (role === 'host') { try { mine = HH.mp.toCode(await offerP); } catch (e) { return; } }
        else if (answerBytes) mine = HH.mp.toCode(answerBytes);
        const canShare = !!(G.navigator && G.navigator.share);
        const myPart = mine ? `<p class="mp-say">${esc(role === 'host' ? label('mp_code_send', 'Send this code to your friend:') : label('mp_code_back', 'Send this code back to your friend:'))}</p>` +
          `<textarea class="mp-code" readonly rows="3" aria-label="${esc(label('mp_text_code', 'Use a text code'))}">${esc(mine)}</textarea>` +
          `<div class="mp-row">${btn('copy', esc(label('mp_copy', 'Copy')), 'small')}${canShare ? btn('share', esc(label('mp_share', 'Share')), 'small') : ''}</div>` : '';
        const needPaste = role === 'host' ? !gotAnswer : !answerBytes;
        const paste = needPaste ? `<p class="mp-say">${esc(role === 'host' ? label('mp_code_paste_reply', 'Paste your friend\'s answer here:') : label('mp_code_paste', 'Paste your friend\'s code here:'))}</p>` +
          `<textarea class="mp-code mp-paste" rows="3" aria-label="${esc(label('mp_paste', 'Paste the code'))}"></textarea>` +
          `<div class="mp-row">${btn('paste', esc(label('mp_connect', 'Connect')), 'main')}</div>` : '<div class="mp-dots"><i></i><i></i><i></i></div>';
        screen('code', (note ? `<p class="mp-hint">${esc(note)}</p>` : '') + myPart + paste + cancelBtn());
      }

      /* ---------- conferma ---------- */
      function onOpen(link) {
        opened = true; tok++;
        clearTimeout(connectT); clearTimeout(deafT);
        if (modem) { modem.close(); modem = null; }
        if (scanner) { scanner.stop(); scanner = null; }
        const fruits = p.fruits || ['❓', '❓', '❓', '❓'];
        let answered = false;
        link.on('close', () => { if (!done && !answered) error('lost'); });
        screen('sas', `<h2 class="mp-title">${esc(label('mp_sas_title', 'Secret fruits!'))}</h2>` +
          `<p class="mp-say">${esc(label('mp_sas_q', 'Do both phones show the same fruits?'))}</p>` +
          `<div class="mp-fruits" role="img" aria-label="${esc(fruits.join(' '))}">${fruits.map((f, i) => `<span class="mp-fruit" style="--i:${i}">${f}</span>`).join('')}</div>` +
          `<div class="mp-row">${btn('sas-yes', esc(label('mp_sas_yes', 'Yes, they match!')), 'main mint')}${btn('sas-no', esc(label('mp_sas_no', 'No')), 'ghost')}</div>`);
        api.link = link;
      }
      const api = { link: null };
      async function confirmSas(ok) {
        const link = api.link;
        if (!link) return;
        if (!ok) { link.confirm(false); setTimeout(() => link.close('sas'), 300); return error('sas'); }
        screen('wait', stage('hop') + `<p class="mp-say">${esc(label('mp_wait_friend', 'Waiting for your friend to say yes…'))}</p><div class="mp-dots"><i></i><i></i><i></i></div>` + cancelBtn());
        const yes = await link.confirm(true);
        if (done) return;
        if (yes) { if (HH.audio && HH.audio.sfx && HH.audio.sfx.win) try { HH.audio.sfx.win(); } catch (e) { /* audio non pronto */ } finish(link); }
        else { link.close('sas'); error('sas'); }
      }

      /* ---------- azioni ---------- */
      async function act(a, el) {
        if (done) return;
        if (a === 'cancel') return cancel();
        if (a === 'host' || a === 'join') return start(a === 'host' ? 'host' : 'guest');
        if (a === 'retry') { if (p) p.close(); p = null; return choose(); }
        if (a === 'mic-ok') return sound();
        if (a === 'qr') return qrHost('');
        if (a === 'scan') return qrGuest('');
        if (a === 'scan-answer') return scan('', label('mp_qr_point', 'Point the camera at the QR code on your friend\'s phone.'), (bytes) => handleAnswer(bytes));
        if (a === 'code') return codeScreen();
        if (a === 'sas-yes') return confirmSas(true);
        if (a === 'sas-no') return confirmSas(false);
        if (a === 'copy' || a === 'share') {
          const t = body.querySelector('.mp-code[readonly]');
          if (!t) return;
          if (a === 'share') { try { await G.navigator.share({ text: t.value }); return; } catch (e) { /* annullato: si copia */ } }
          try { await G.navigator.clipboard.writeText(t.value); } catch (e) { t.select(); try { D.execCommand('copy'); } catch (er) { /* niente appunti */ } }
          el.textContent = label('mp_copied', 'Copied!');
          return;
        }
        if (a === 'paste') {
          const t = body.querySelector('.mp-paste');
          let bytes;
          try { bytes = HH.mp.fromCode(t.value); HH.mp.unpack(bytes); } catch (e) { t.classList.add('bad'); say(label('mp_err_code', 'That code doesn\'t look right. Try again?')); return; }
          if (role === 'host') { await handleAnswer(bytes); }
          else { await handleOffer(bytes, 'code'); }
        }
      }

      choose();
    });
  }

  HH.mp = HH.mp || {};
  HH.mp.pair = pair;
  HH.mp.pairTimes = T;
})(typeof globalThis !== 'undefined' ? globalThis : window);
