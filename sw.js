/* Service worker: app completamente offline.
 * - precache della shell (cache-first)
 * - font Google in cache al primo avvio online (stale-while-revalidate)
 * Incrementa VERSION a ogni release (lo fa `npm run release`).
 */
const VERSION = 'hh-v0.4.1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'src/styles.css', 'src/app.js', 'src/i18n/locales.js', 'src/core/rng.js', 'src/core/core.js', 'src/core/mascot.js', 'src/core/audio.js', 'src/core/fx.js',
  'src/games/hedgedoku-logic.js', 'src/games/hedgedoku-ui.js', 'src/games/boba-logic.js', 'src/games/boba-ui.js',
  'src/games/lantern-logic.js', 'src/games/lantern-ui.js',
  'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('index.html'))));
});
