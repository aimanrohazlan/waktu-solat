// App-shell cache. Network-first so updates appear when online; cache when offline.
// Prayer-time data is NOT handled here (it's cached per month in localStorage).
const CACHE = "ws-shell-v3";
const SHELL = [
  "./", "index.html", "css/styles.css",
  "js/app.js", "js/time.js", "js/zones.js", "js/i18n.js", "js/data.js", "js/settings.js",
  "manifest.webmanifest",
  "fonts/Lora.woff2", "fonts/Raleway.woff2", "fonts/PlayfairDisplay.woff2", "fonts/Inter.woff2", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then((hit) => hit || (e.request.mode === "navigate" ? caches.match("index.html") : undefined))
        .then((hit) => hit || Response.error())),
  );
});
