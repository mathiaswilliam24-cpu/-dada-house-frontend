const CACHE = "dada-house-v1";
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

  // Everything else → network-first, offline fallback
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
        caches.match(event.request).then((cached) =>
          cached || (event.request.headers.get("accept")?.includes("text/html")
            ? caches.match(OFFLINE)
            : Response.error())
        )
      )
  );
});
