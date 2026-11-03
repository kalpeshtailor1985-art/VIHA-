/* KT Maths Exam Suite - service worker
   - Pre-caches every local file so the app opens offline.
   - Network-first for the app's own files: users always get the newest version when online.
   - BUMP CACHE_VERSION every time you deploy, so old caches are deleted. */
const CACHE_VERSION = 'kt-maths-v17';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './web_206.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './css/app.css',
  './css/print-paper.css',
  './js/state.js',
  './js/utils/media-math.js',
  './js/utils/word-question-parser.js',
  './js/modules/blueprint-matrix.js',
  './js/modules/paper-workspace.js',
  './js/modules/gujcet-workspace.js',
  './js/app.js',
  './js/secure-auth.js',
  './js/signup-plan.js',
  './js/access-migrate.js',
  './js/catalog-guest.js',
  './js/init.js',
  './check.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      // one missing file must not break the whole install
      Promise.all(LOCAL_ASSETS.map(u => cache.add(u).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  const url = new URL(req.url);

  // Never cache Firebase / Google auth & database traffic (must always be live)
  if (/(^|\.)(firebaseio\.com|firebasedatabase\.app|firebaseapp\.com|googleapis\.com)$/.test(url.hostname) && url.hostname !== 'fonts.googleapis.com') return;

  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin) {
    // network first, fall back to cache when offline
    event.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // CDN libraries (tailwind, katex, mathjax, xlsx...): cache first, refresh in background
    event.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(res => {
          if (res && (res.status === 200 || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
  }
});
