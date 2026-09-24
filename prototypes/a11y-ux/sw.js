// Idea Board a11y prototype — service worker (namespaced, isolated from live).
// App-shell cache only; Firebase is never cached (network -> localStorage fallback).
var CACHE_NAME = 'ideaboard-a11y-proto-shell-v2.5.0-a11y-proto';
var SHELL = [
  './ideaboard.html',
  './app-a11y.js?v=2.5.0-a11y-proto',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './screenshot-wide.png',
  './screenshot-narrow.png'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(SHELL).catch(function(){}); }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { if (k !== CACHE_NAME) return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  // Never cache Firebase or the Firebase SDK CDN — always hit the network.
  if (url.hostname.indexOf('firebaseio.com') !== -1 ||
      url.hostname.indexOf('gstatic.com') !== -1 ||
      url.pathname.indexOf('/favicon.ico') !== -1) {
    return;
  }
  if (e.request.method !== 'GET') return;
  // Navigation: serve the shell HTML, falling back to cache offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(function() { return caches.match('./ideaboard.html'); }));
    return;
  }
  // Same-origin assets: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        var net = fetch(e.request).then(function(res) {
          if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE_NAME).then(function(c){ c.put(e.request, copy); }); }
          return res;
        }).catch(function() { return cached; });
        return cached || net;
      })
    );
  }
});
