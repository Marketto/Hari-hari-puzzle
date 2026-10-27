/* Uso dell'app: tempo di gioco e partite per ogni gioco.
 * - SEMPRE in locale (localStorage del telefono), mostrato in "Progressi". Nessun dato esce dal dispositivo.
 * - Statistiche anonime facoltative con GoatCounter (senza cookie): solo se è impostato CODE qui sotto E il giocatore
 *   ha detto sì nella finestra del consenso. Si inviano solo eventi "open/<gioco>" (partita aperta) e "minute/<gioco>"
 *   (un minuto di gioco): niente nomi, niente identificativi, niente salvataggi. Offline restano in coda e partono dopo.
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  // codice del sito GoatCounter (https://<CODE>.goatcounter.com). Vuoto = statistiche remote spente.
  const CODE = '';
  const st = () => HH.store;
  const QMAX = 300;
  let busy = false;
  const mins = {};
  const U = {
    CODE,
    get(id) { return Object.assign({ sec: 0, sessions: 0, last: 0 }, st().get('use:' + id, null) || {}); },
    total(ids) { return ids.reduce((a, id) => a + U.get(id).sec, 0); },
    // partita aperta
    open(id) {
      const u = U.get(id);
      u.sessions++; u.last = Date.now();
      st().set('use:' + id, u);
      mins[id] = 0;
      U.event('open/' + id);
    },
    // un secondo di gioco visibile
    tick(id) {
      const u = U.get(id);
      u.sec++; u.last = Date.now();
      st().set('use:' + id, u);
      mins[id] = (mins[id] || 0) + 1;
      if (mins[id] % 60 === 0) U.event('minute/' + id);
    },
    consent() { return st().get('anConsent', null); },            // true · false · null (non ancora chiesto)
    setConsent(v) { st().set('anConsent', !!v); if (v) U.flush(); else st().set('anQueue', []); },
    canAsk() { return !!U.CODE; },
    enabled() { return !!U.CODE && U.consent() === true; },
    event(path) {
      if (!U.enabled()) return;
      const q = st().get('anQueue', []);
      q.push(path);
      if (q.length > QMAX) q.splice(0, q.length - QMAX);
      st().set('anQueue', q);
      U.flush();
    },
    flush() {
      if (!U.enabled() || busy || (G.navigator && G.navigator.onLine === false)) return;
      const q = st().get('anQueue', []);
      if (!q.length) return;
      busy = true;
      const url = `https://${U.CODE}.goatcounter.com/count?p=${encodeURIComponent('/' + q[0])}&e=true&rnd=${Math.random().toString(36).slice(2)}`;
      G.fetch(url, { mode: 'no-cors', keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' })
        .then(() => { const q2 = st().get('anQueue', []); q2.shift(); st().set('anQueue', q2); busy = false; setTimeout(U.flush, 250); })
        .catch(() => { busy = false; });
    },
  };
  HH.usage = U;
  if (G.addEventListener) G.addEventListener('online', () => U.flush());
})(typeof globalThis !== 'undefined' ? globalThis : window);
