/* Core: salvataggi locali e traduzioni.
 * HH.store.get/set (localStorage protetto da try/catch)
 * HH.i18n.t(key), .set(code), .code, .detect()
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
