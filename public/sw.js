// public/sw.js — SW minimalista (auth-safe, sem cache de HTML/API)
const CACHE = 'confiance-static-v9';

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

function isApiPath(pathname) {
  return pathname.startsWith('/api/');
}

function isAuthPath(pathname) {
  return pathname === '/login' || pathname.startsWith('/auth/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // só same-origin
  if (!isSameOrigin(req.url)) return;

  // NUNCA cachear API
  if (isApiPath(url.pathname)) {
    e.respondWith(fetch(req));
    return;
  }

  // NUNCA cachear páginas de auth
  if (req.mode === 'navigate' && isAuthPath(url.pathname)) {
    e.respondWith(fetch(req));
    return;
  }

  // Navegação (HTML): network-only (evita “desktop abrir página do mobile”)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req));
    return;
  }

  // Assets: cache-first
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
