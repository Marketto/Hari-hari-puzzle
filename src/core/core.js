/* Core: salvataggi locali, progressi, traduzioni.
 * HH.store.get/set/del        localStorage protetto da try/catch (prefisso "harihari:")
 * HH.progress                 progressi per gioco + partita in sospeso
 *   get(id) -> { level, wins, best, total, stars, bestTime, last }
 *   set(id, p) · totalScore()
 *   loadGame(id) / saveGame(id, { level, elapsed, state }) / clearGame(id)
 * HH.i18n.t(key), .set(code), .code, .detect(), .onChange(fn)
 */
(function (G) {
  const HH = (G.HH = G.HH || {});
  const PREFIX = 'harihari:';

  HH.store = {
    get(k, d) {
      try { const v = G.localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set(k, v) { try { G.localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* storage bloccato */ } },
    del(k) { try { G.localStorage.removeItem(PREFIX + k); } catch (e) { /* storage bloccato */ } },
  };

  HH.VERSION = '0.10.1';                     // versione dell'app (un test la confronta con package.json e sw.js)
  const SAVE_VERSION = 2;
  HH.progress = {
    get(id) {
      const base = { level: HH.store.get('level:' + id, 1), wins: 0, best: 0, total: 0, stars: 0, bestTime: 0, last: 0 };
      return Object.assign(base, HH.store.get('prog:' + id, {}));
    },
    set(id, p) { HH.store.set('prog:' + id, p); },
    totalScore() { return (HH.games || []).reduce((s, g) => s + (HH.progress.get(g.id).total || 0), 0); },
    // I salvataggi di versioni precedenti passano dalle migrazioni (MIGRATE[v] porta da v a v+1);
    // se una migrazione manca il salvataggio resta intatto in memoria ma non viene caricato.
    loadGame(id) {
      let s = HH.store.get('save:' + id, null);
      if (!s || !s.state || typeof s.v !== 'number') return null;
      while (s && s.v < SAVE_VERSION) s = HH.progress.MIGRATE[s.v] ? HH.progress.MIGRATE[s.v](s, id) : null;
      return s && s.v === SAVE_VERSION && s.state ? s : null;
    },
    MIGRATE: {},
    SAVE_VERSION,
    saveGame(id, data) { HH.store.set('save:' + id, Object.assign({ v: SAVE_VERSION, ts: Date.now() }, data)); },
    clearGame(id) { HH.store.del('save:' + id); },
  };

  const listeners = [];
  const i18n = {
    code: 'en',
    detect() {
      const saved = HH.store.get('lang');
      if (saved && HH.LOCALES[saved]) return saved;
      const prefs = (G.navigator && (G.navigator.languages || [G.navigator.language])) || [];
      for (const p of prefs) {
        const base = String(p).toLowerCase().split('-')[0];
        const alias = { nb: 'no', nn: 'no' }[base] || base;
        if (HH.LOCALES[alias]) return alias;
      }
      return 'en';
    },
    set(code) {
      if (!HH.LOCALES[code]) code = 'en';
      i18n.code = code;
      HH.store.set('lang', code);
      const meta = HH.LANGS.find((l) => l.code === code);
      document.documentElement.lang = code;
      document.documentElement.dir = meta ? meta.dir : 'ltr';
      listeners.forEach((fn) => fn(code));
    },
    t(key) { return (HH.LOCALES[i18n.code] || {})[key] || HH.LOCALES.en[key] || key; },
    onChange(fn) { listeners.push(fn); },
  };
  HH.i18n = i18n;
})(typeof globalThis !== 'undefined' ? globalThis : window);
