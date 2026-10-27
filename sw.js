/* Offline support: serve the app from cache, refresh it in the background. Bump VERSION on each release. */
const VERSION = "dailyplan-v1";
const SHELL = ["./", "index.html", "app.css", "app.js", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// stale-while-revalidate for the app and Google Fonts
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const ours = url.origin === location.origin;
  const fonts = url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (!ours && !fonts) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: ours });
      const fresh = fetch(e.request)
        .then((res) => { if (res.ok || res.type === "opaque") cache.put(e.request, res.clone()); return res; })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
