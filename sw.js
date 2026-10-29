/* Service worker: app completamente offline + aggiornamenti automatici.
 * - precache della shell (cache-first), scaricata ignorando la cache HTTP così ogni versione è completa e coerente
 * - font Google in cache al primo avvio online (stale-while-revalidate)
 * - aggiornamento: la versione nuova si installa in background e aspetta; la pagina le manda {type:'skip'}
 *   in un momento sicuro (home o app in background) dopo aver salvato la partita. I salvataggi stanno in localStorage:
 *   il service worker non li tocca mai, cancella solo le sue cache vecchie.
 * Incrementa VERSION a ogni release (un test controlla che coincida con package.json).
 */
const VERSION = 'hh-v0.22.1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'src/styles.css', 'src/app.js', 'src/i18n/locales.js', 'src/core/rng.js', 'src/core/rules.js', 'src/core/core.js', 'src/core/mascot.js', 'src/core/audio.js', 'src/core/fx.js', 'src/core/usage.js',
  'src/games/tokens.css', 'src/games/catalog.js', 'src/games/cards.js',
  'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/maskable-512.png', 'assets/icons/apple-touch-icon.png',
];
// file dei giochi: scaricati e messi in cache solo quando il gioco viene aperto la prima volta (lazy load)
importScripts('src/games/catalog.js');
const GAME_FILES = new Set(self.HH.catalog.flatMap((g) => g.files));
const isGameFile = (url) => { const u = new URL(url, self.registration.scope); return GAME_FILES.has(u.pathname.slice(new URL(self.registration.scope).pathname.length)); };

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })));
    await carryGames(c);
    // prima installazione: si attiva subito. Aggiornamento: aspetta il via dalla pagina SOLO se la pagina aperta
    // sa gestirlo (risponde "can-update"); con pagine di versioni vecchie, o ad app chiusa, si attiva subito
    // (altrimenti resterebbe in attesa finché l'app non viene chiusa del tutto).
    if (!self.registration.active || !(await pagesCanUpdate())) await self.skipWaiting();
  })());
});

// aggiornamento: i giochi già scaricati con la versione precedente si riscaricano aggiornati nella cache nuova,
// così restano giocabili offline (se la rete manca si tiene la copia vecchia)
async function carryGames(c) {
  const old = (await caches.keys()).filter((k) => k !== VERSION && k.startsWith('hh-v'));
  const have = new Map();
  for (const k of old) for (const req of await (await caches.open(k)).keys()) if (isGameFile(req.url)) have.set(req.url, k);
  // un gioco si porta dietro solo se tutti i suoi file c'erano
  const scope = new URL(self.registration.scope);
  const games = self.HH.catalog.filter((g) => g.files.every((f) => have.has(new URL(f, scope).href)));
  await Promise.all(games.flatMap((g) => g.files.map(async (f) => {
    const url = new URL(f, scope).href;
    try { const r = await fetch(new Request(url, { cache: 'reload' })); if (r.ok) return c.put(url, r); throw new Error(r.status); }
    catch (e) { const r = await (await caches.open(have.get(url))).match(url); if (r) return c.put(url, r); }
  })));
}

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
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    // file di un gioco aperto per la prima volta: si scarica e resta in cache per giocare offline
    if (isGameFile(e.request.url)) {
      const r = await fetch(e.request, { cache: 'reload' });
      if (r.ok) c.put(new URL(e.request.url).origin + new URL(e.request.url).pathname, r.clone());
      return r;
    }
    return fetch(e.request).catch(() => caches.match('index.html'));
  }));
});
