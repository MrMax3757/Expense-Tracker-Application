const CACHE = "daybook-shell-v1";
const SHELL = [
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./js/app.js",
  "./js/backup.js",
  "./js/defaults.js",
  "./js/insights.js",
  "./js/ledger.js",
  "./js/money.js",
  "./js/parser.js",
  "./js/period.js",
  "./js/store.js",
  "./fonts/IBMPlexSans-Regular.woff2",
  "./fonts/IBMPlexSans-Medium.woff2",
  "./fonts/IBMPlexSans-SemiBold.woff2",
  "./fonts/Literata-Regular.woff2",
  "./fonts/Literata-Medium.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const home = await caches.match("./index.html");
        if (home) return home;
      }
      return new Response("Daybook is offline and this file is not saved on the phone yet.", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
