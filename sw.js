/**
 * BHOJANA — Service Worker (sw.js)
 * Cache-first strategy for all app shell assets.
 * Bump CACHE_NAME on every deploy.
 */

const CACHE_NAME = 'bhojana-v7';

const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'styles/tokens.css',
  'styles/base.css',
  'styles/components.css',
  'styles/layout.css',
  'styles/animations.css',
  'js/app.js',
  'js/db.js',
  'js/utils.js',
  'js/icons.js',
  'js/pages/home.js',
  'js/pages/menu.js',
  'js/pages/customers.js',
  'js/pages/schedule.js',
  'js/components/toast.js',
  'js/components/modal.js',
  'js/components/confirm.js',
  'vendor/sql-wasm.js',
  'vendor/sql-wasm.wasm',
  'vendor/html2canvas.min.js',
  'fonts/fraunces-400.woff2',
  'fonts/fraunces-600.woff2',
  'fonts/fraunces-700.woff2',
  'fonts/manrope-variable.woff2',
  'fonts/plex-mono-400.woff2',
  'fonts/plex-mono-500.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

/* ── Install: pre-cache everything ──────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: delete old caches ─────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first ──────────────────────────────────── */
self.addEventListener('fetch', event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // Not in cache → fetch from network and cache it
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});
