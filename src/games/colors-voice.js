/* Hari Colors — voce di Hari con la sintesi vocale del dispositivo (Web Speech API, speechSynthesis).
 * Solo voci di sistema LOCALI (niente voci "online" del browser, che farebbero chiamate esterne): la scelta è in
 * HH.colors.pickVoice. Se non c'è una voce per la lingua dell'app, se la sintesi non esiste o non parte, il gioco
 * mostra il nome del colore nel fumetto di Hari (vedi colors-ui.js).
 *
 * Differenze fra browser gestite qui:
 *  - getVoices() all'inizio può essere vuoto: si ricarica a ogni 'voiceschanged' e, per Safari/iOS che spesso non
 *    lo manda, si riprova ogni 250 ms per qualche secondo;
 *  - iOS parla solo se la prima speak() avviene dentro un tocco: unlock() pronuncia un'enunciazione vuota a volume 0
 *    nel gestore del tocco "Inizia";
 *  - Chrome può restare "in pausa" o perdere gli eventi se l'enunciazione viene raccolta dal GC: resume() prima di
 *    speak() e riferimento tenuto in vita; se 'start' non arriva entro START_MS si considera fallita.
 *
 * HH.colorsVoice: init(), voiceFor(code), can(code), unlock(), speak(text, code, { start, end, fail }), cancel(), busy()
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const START_MS = 1800, MAX_MS = 4000;
  let voices = [], inited = false, polls = 0, fails = 0, cur = null, unlocked = false;

  const synth = () => (G.speechSynthesis && typeof G.SpeechSynthesisUtterance === 'function' ? G.speechSynthesis : null);
  function load() {
    const s = synth();
    if (!s) return;
    try { const v = s.getVoices(); if (v && v.length) voices = Array.from(v); } catch (e) { /* niente voci */ }
  }
  function init() {
    if (inited) return;
    inited = true;
    const s = synth();
    if (!s) return;
    load();
    if (s.addEventListener) s.addEventListener('voiceschanged', load);
    else s.onvoiceschanged = load;
    const poll = () => { if (voices.length || polls++ > 16) return; load(); setTimeout(poll, 250); };
    poll();
  }
  const voiceFor = (code) => (HH.colors && voices.length ? HH.colors.pickVoice(voices, code) : null);
  // due enunciazioni di fila che non partono: per questa sessione si usa il fumetto
  const can = (code) => !!synth() && fails < 2 && !!voiceFor(code);

  function unlock() {
    const s = synth();
    if (!s || unlocked) return;
    unlocked = true;
    try { const u = new G.SpeechSynthesisUtterance(' '); u.volume = 0; s.speak(u); } catch (e) { /* ignorato */ }
  }

  function cancel() {
    const c = cur;
    cur = null;
    // annullata da noi: niente 'fail' (non conta come voce che non funziona), solo 'end' se stava già parlando
    if (c) { clearTimeout(c.t1); clearTimeout(c.t2); const was = c.started && !c.ended; c.ended = true; if (was) c.cb.end && c.cb.end(); }
    const s = synth();
    if (s) try { s.cancel(); } catch (e) { /* ignorato */ }
  }

  function speak(text, code, cb = {}) {
    const s = synth(), v = voiceFor(code);
    if (!s || !v) { cb.fail && cb.fail(); return false; }
    cancel();
    const u = new G.SpeechSynthesisUtterance(text);
    u.voice = v; u.lang = v.lang || code; u.rate = 0.92; u.pitch = 1.2; u.volume = 1;
    const c = { u, cb, started: false, ended: false, t1: 0, t2: 0 };
    cur = c;
    const finish = (ok) => {
      if (c.ended) return;
      c.ended = true;
      clearTimeout(c.t1); clearTimeout(c.t2);
      if (cur === c) cur = null;
      if (!c.started) { fails++; cb.fail && cb.fail(); } else cb.end && cb.end(ok);
    };
    u.onstart = () => {
      if (c.ended || c.started) return;
      c.started = true; fails = 0;
      clearTimeout(c.t1);
      c.t2 = setTimeout(() => finish(true), MAX_MS);      // 'end' a volte non arriva (iOS): la musica torna su comunque
      cb.start && cb.start();
    };
    u.onend = () => finish(true);
    u.onerror = (e) => { if (e && (e.error === 'interrupted' || e.error === 'canceled') && c.started) return finish(true); finish(false); };
    c.t1 = setTimeout(() => { if (!c.started) { try { s.cancel(); } catch (e) { /* ignorato */ } finish(false); } }, START_MS);
    try { if (s.paused) s.resume(); s.speak(u); } catch (e) { finish(false); return false; }
    return true;
  }

  HH.colorsVoice = { init, voiceFor, can, unlock, speak, cancel, busy: () => !!cur, get voices() { return voices; } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
