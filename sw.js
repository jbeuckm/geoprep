/* GeoDrill service worker: precache the whole app (shell, libraries, map data) so it works offline. */
const VERSION = 'geodrill-v28';
importScripts('./data/iso.js');
const FLAGS = [...new Set(Object.values(self.ISO_A2))].map(c => `./data/flags/${c}.svg`);
const PRECACHE = [
  './', './index.html', './app.js', './pwa.js', './manifest.webmanifest', './data/iso.js', './data/clues.js', ...FLAGS,
  './data/places.js', './data/regions.js', './data/subcapitals.js', './data/subcities.js',
  './data/countries-50m.json', './data/lakes.json',
  './data/admin1/usa.json', './data/admin1/india.json', './data/admin1/china.json', './data/admin1/brazil.json',
  './data/admin1/canada.json', './data/admin1/australia.json', './data/admin1/russia.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js',
];

self.addEventListener('install', e => {
  // cache:'reload' bypasses the browser's HTTP cache, so a new version never precaches stale copies of the app.
  const reqs = PRECACHE.map(u => new URL(u, self.location).origin === self.location.origin ? new Request(u, { cache: 'reload' }) : u);
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(reqs)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// Cache-first for everything we know about; stale-while-revalidate keeps same-origin files fresh.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: sameOrigin });
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque') && (sameOrigin || url.hostname === 'cdnjs.cloudflare.com')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { if (sameOrigin) e.waitUntil(network); return cached; }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') return cache.match('./index.html');
    return new Response('offline', { status: 503, statusText: 'offline' });
  }));
});
