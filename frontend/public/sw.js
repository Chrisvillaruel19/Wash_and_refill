// Wash & Refill service worker — deliberately minimal.
//
// Every order, stock count and cash figure comes live from the backend, so
// nothing app-related is cached for offline use (stale data at a cash
// counter is worse than no data). The only job here: when a page navigation
// fails because the device is offline, show /offline.html instead of the
// browser's own error page. Bump CACHE when offline.html or its icon change.
const CACHE = "wash-refill-offline-v1";
const OFFLINE_ASSETS = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Page navigations: always go to the network; fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  // The offline page's own icon, when the network is gone.
  if (request.method === "GET" && new URL(request.url).pathname === "/icons/icon-192.png") {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
  // Everything else (API calls, scripts, images) goes straight to the network untouched.
});
