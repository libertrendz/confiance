// public/sw.js — SW minimalista (auth-safe + sem cache de /api)
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
  '/app-novo.png',
  '/powered_by_libertrendzt.png',
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

function isApiPath(pathname) {
  return pathname.startsWith('/api/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (!isSameOrigin(req.url)) return;

  // NUNCA cachear API (senão lista/edição fica “presa”)
  if (isApiPath(url.pathname)) {
    e.respondWith(fetch(req));
    return;
  }

  // Navegação (HTML) — SEM cache (evita “página fantasma” / sessão cruzada)
  if (req.mode === 'navigate') {
    // Auth: sempre rede
    if (isAuthPath(url.pathname)) {
      e.respondWith(fetch(req));
      return;
    }

    // App: sempre rede (sem fallback pra HTML cache)
    e.respondWith(fetch(req));
    return;
  }

  // Assets estáticos: cache-first
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
