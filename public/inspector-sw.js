// Minimal service worker for the Inspector PWA.
// Scoped to /inspector/* — caches the app shell and falls back gracefully when offline.
// Real offline data lives in IndexedDB (managed by useOfflineInspections + useSyncQueue).

const CACHE_VERSION = 'inspector-v1';
const SHELL_URLS = [
  '/inspector/today',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => {
        // Best-effort precache. Don't fail install if a URL is unreachable.
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache Supabase, auth, or analytics traffic.
  if (
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('lovable.dev')
  ) {
    return;
  }

  // Only handle inspector routes + same-origin static assets.
  const isInspectorRoute = url.pathname.startsWith('/inspector');
  const isSameOriginAsset = url.origin === self.location.origin;
  if (!isInspectorRoute && !isSameOriginAsset) return;

  // Network-first for navigations, falling back to cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) =>
            cached || caches.match('/inspector/today')
          )
        )
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
