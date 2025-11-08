// public/sw.js — SW minimalista com versão nova de cache
const CACHE = 'confiance-static-v5'; // <— bump aqui sempre que layout/js mudar
const CORE = [
  '/', '/manifest.webmanifest',
  '/icon-192.png','/icon-512.png','/apple-touch-icon.png','/favicon.ico'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first para HTML; cache-first pro resto
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isHTML = accept.includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((r) =>
      r || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(()=>{});
        return res;
      })
    )
  );
});
