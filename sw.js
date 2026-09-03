/* Idea Board — Service Worker
 * Offline strategy: cache the APP SHELL only (HTML/JS/icons/manifest).
 * Firebase (Realtime DB + CDN SDK) is deliberately NOT cached — those requests
 * go to the network and, when offline/blocked, the app falls back to
 * localStorage (its existing behaviour). We never cache live DB data.
 *
 * Bump CACHE_VERSION on every release so old caches are cleaned up on activate.
 */
const CACHE_VERSION = 'v2.4.6';
const CACHE_NAME = `ideaboard-shell-${CACHE_VERSION}`;

// App-shell assets to precache. app.js is cached at the exact query the HTML
// requests (?v=2.4) so the cached URL matches the fetch URL.
const SHELL_ASSETS = [
  './',
  './ideaboard.html',
  './app.js?v=2.4.6',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './screenshot-wide.png',
  './screenshot-narrow.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll is atomic; if one asset 404s the whole install fails, so keep
      // this list to assets we know exist.
      cache.addAll(SHELL_ASSETS)
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('ideaboard-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Requests we must never intercept/cache — let them hit the network directly.
function isBypassed(url) {
  return (
    url.hostname.includes('gstatic.com') ||       // Firebase SDK CDN
    url.hostname.includes('firebaseio.com') ||     // Realtime DB
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google-analytics.com')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET; never cache POST/PUT etc.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Leave Firebase / cross-origin CDN traffic entirely to the network.
  if (isBypassed(url)) return;

  // Only manage our own origin's shell assets.
  if (url.origin !== self.location.origin) return;

  // Don't intercept the browser's default /favicon.ico probe — let it hit the
  // network (404 is harmless) rather than the SW producing a rejected promise.
  if (url.pathname.endsWith('/favicon.ico')) return;

  // Navigation requests: serve the cached shell, fall back to network,
  // and if both miss (offline, uncached route) serve the cached HTML shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('./ideaboard.html').then((r) => r || caches.match('./'))
      )
    );
    return;
  }

  // Same-origin assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
