/* Service worker: app completamente offline + aggiornamenti automatici.
 * - precache della shell (cache-first), scaricata ignorando la cache HTTP così ogni versione è completa e coerente
 * - font Google in cache al primo avvio online (stale-while-revalidate)
 * - aggiornamento: la versione nuova si installa in background e aspetta; la pagina le manda {type:'skip'}
 *   in un momento sicuro (home o app in background) dopo aver salvato la partita. I salvataggi stanno in localStorage:
 *   il service worker non li tocca mai, cancella solo le sue cache vecchie.
 * Incrementa VERSION a ogni release (un test controlla che coincida con package.json).
 */
const VERSION = 'hh-v0.7.1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'src/styles.css', 'src/app.js', 'src/i18n/locales.js', 'src/core/rng.js', 'src/core/rules.js', 'src/core/core.js', 'src/core/mascot.js', 'src/core/audio.js', 'src/core/fx.js',
  'src/games/hedgedoku-logic.js', 'src/games/hedgedoku-ui.js', 'src/games/boba-logic.js', 'src/games/boba-ui.js',
  'src/games/lantern-logic.js', 'src/games/lantern-ui.js',
  'src/games/sushi-logic.js', 'src/games/sushi-ui.js', 'src/games/sushi.css',
  'src/games/fixit-logic.js', 'src/games/fixit-kit.js', 'src/games/fixit-scene-house.js', 'src/games/fixit-scene-kitchen.js', 'src/games/fixit-scene-kitchen.css', 'src/games/fixit-scene-bedroom.js', 'src/games/fixit-scene-bedroom.css', 'src/games/fixit-scene-bathroom.js', 'src/games/fixit-scene-bathroom.css', 'src/games/fixit-scene-garden.js', 'src/games/fixit-scene-garden.css', 'src/games/fixit-ui.js', 'src/games/fixit.css',
  'src/games/parade-logic.js', 'src/games/parade-ui.js', 'src/games/parade.css',
  'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/maskable-512.png', 'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })));
    // prima installazione: si attiva subito. Aggiornamento: aspetta il via dalla pagina SOLO se la pagina aperta
    // sa gestirlo (risponde "can-update"); con pagine di versioni vecchie, o ad app chiusa, si attiva subito
    // (altrimenti resterebbe in attesa finché l'app non viene chiusa del tutto).
    if (!self.registration.active || !(await pagesCanUpdate())) await self.skipWaiting();
  })());
});

async function pagesCanUpdate() {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (!list.length) return false;
  return new Promise((resolve) => {
    const t = setTimeout(() => { self.removeEventListener('message', on); resolve(false); }, 1500);
    function on(e) { if (e.data && e.data.type === 'can-update') { clearTimeout(t); self.removeEventListener('message', on); resolve(true); } }
    self.addEventListener('message', on);
    list.forEach((c) => c.postMessage({ type: 'ask-update' }));
  });
}

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'skip') self.skipWaiting();
  if (e.data && e.data.type === 'version' && e.source) e.source.postMessage({ type: 'version', version: VERSION });
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'hh-fonts').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.open('hh-fonts').then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then((c) => c.match(e.request, { ignoreSearch: true }))
    .then((hit) => hit || fetch(e.request).catch(() => caches.match('index.html'))));
});
