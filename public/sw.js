// public/sw.js — SW minimalista (auth-safe)
const CACHE = 'confiance-static-v8';

const CORE = [
  '/manifest.webmanifest',
  '/sw.js',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isSameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function isAuthPath(pathname) {
  return pathname === '/login' || pathname.startsWith('/auth/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // só controla same-origin
  if (!isSameOrigin(req.url)) return;

  // Navegação (HTML/document)
  if (req.mode === 'navigate') {
    // Páginas de auth: SEM cache (evita sessão velha / redirects estranhos)
    if (isAuthPath(url.pathname)) {
      e.respondWith(fetch(req));
      return;
    }

    // Outras páginas: network-first, fallback cache (opcional)
    e.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => caches.match(req).then((r) => r || caches.match('/menu') || fetch('/menu')))
    );
    return;
  }

  // Assets: cache-first com preenchimento
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
