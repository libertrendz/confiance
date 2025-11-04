// public/sw.js — Service Worker oficial Confiance
const CACHE = 'confiance-static-v1';

// Arquivos essenciais do app (sempre em cache)
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo-confiance.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Instala e guarda o essencial
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

// Limpa versões antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: network-first para HTML, cache-first para o resto
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isHTML = accept.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('/')))
    );
  } else {
    event.respondWith(
      caches.match(req).then((res) =>
        res ||
        fetch(req)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone)).catch(() => {});
            return res;
          })
          .catch(() => res)
      )
    );
  }
});
