/* Idea Board — Service Worker  [PROTOTYPE]
 * Same shell-only strategy as the live SW, with two prototype differences:
 *   1. Cache name is namespaced "ideaboard-proto-shell-" so it can never
 *      collide with the live app's cache.
 *   2. Precaches app-proto.js + the auth files instead of app.js.
 *
 * Firebase AND the MSAL sign-in CDN are deliberately NOT cached — those go to
 * the network. When offline/blocked the app falls back to localStorage.
 *
 * Bump CACHE_VERSION on every proto iteration so old caches clean up on activate.
 */
const CACHE_VERSION = 'v2.5.0-proto';
const CACHE_NAME = `ideaboard-proto-shell-${CACHE_VERSION}`;

// App-shell assets to precache. Auth config/gate are included so the gate can
// still render offline (it will fail closed with a clear message if the MSAL
// CDN itself is unreachable on a gated host).
const SHELL_ASSETS = [
  './',
  './ideaboard.html',
  './app-proto.js',
  './auth-config.js',
  './auth.js',
  './msal-browser.min.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_ASSETS)
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('ideaboard-proto-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Requests we must never intercept/cache — let them hit the network directly.
function isBypassed(url) {
  return (
    url.hostname.includes('gstatic.com') ||        // Firebase SDK CDN
    url.hostname.includes('firebaseio.com') ||      // Realtime DB
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google-analytics.com') ||
    url.hostname.includes('msauth.net') ||          // MSAL library CDN
    url.hostname.includes('login.microsoftonline.com') || // Entra sign-in
    url.hostname.includes('login.microsoft.com') ||
    url.hostname.includes('login.windows.net')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (isBypassed(url)) return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/favicon.ico')) return;

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
