// De service worker van De Spelkeet. Hij bewaart alleen een pagina voor als er geen internet is: de spellen zelf draaien
// live op de server, dus verder gaat alles gewoon over het netwerk (zonder cache, zodat je altijd de nieuwste versie hebt).
const CACHE = 'spelkeet-offline-1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, '/img/speelhal-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// alleen bij het openen van een pagina: lukt dat niet, dan de offline-pagina
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
