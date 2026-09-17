const CACHE = "dada-house-v3";
const OFFLINE = "/offline.html";

const PRECACHE = [
  "/",
  OFFLINE,
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install — precache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch — network-first with offline fallback
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept auth, payments, or API mutations
  if (
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/store/checkout") ||
    url.pathname.startsWith("/api/payments")
  ) return;

  // Static assets → cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Next.js App Router client-side navigations fetch the RSC payload (React
  // Flight, not HTML) via a plain GET to the *same pathname* as the page —
  // caching that under the page's URL and later serving it back for a real
  // document navigation (e.g. after a network hiccup on a technician's phone)
  // renders a blank page, since Flight data isn't valid HTML. Only real
  // top-level document navigations get the cache/offline treatment; every
  // other GET (RSC data requests, API calls) goes straight to the network
  // with no caching and no stale/wrong-shaped fallback.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match(OFFLINE))
      )
  );
});
