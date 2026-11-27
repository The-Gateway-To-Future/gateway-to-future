/* GTF Exam Portal — Service Worker (Network-First Fresh HTML + Offline Fallback + Logout Cache Purge) */
const CACHE_NAME = "gtf-exam-portal-v5-secure";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json?v=gtf-official",
  "/icons/icon-192.png?v=gtf-official",
  "/icons/icon-512.png?v=gtf-official",
  "/icons/apple-touch-icon.png?v=gtf-official",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Purge any cached HTML responses when user logs out (shared device privacy)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GTF_CLEAR_AUTH_CACHES") {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const requests = await cache.keys();
        await Promise.all(
          requests.map((req) => {
            const url = new URL(req.url);
            if (
              !url.pathname.startsWith("/_next/static/") &&
              !url.pathname.startsWith("/icons/") &&
              url.pathname !== OFFLINE_URL &&
              url.pathname !== "/manifest.json"
            ) {
              return cache.delete(req);
            }
            return Promise.resolve();
          }),
        );
      }),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // NEVER cache API routes, auth endpoints, AI routes, TTS, or protected streams
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Strictly network-fresh HTML navigation with guaranteed /offline.html fallback (never resolves undefined)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => response)
        .catch(async () => {
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;
          return new Response(
            "<!doctype html><html><body><h1>Offline</h1><p>Please check your internet connection and reload.</p></body></html>",
            { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }),
    );
    return;
  }

  // Stale-while-revalidate for immutable Next.js static bundles & icons only
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, networkResponse.clone()));
            }
            return networkResponse;
          })
          .catch(() => cached || new Response(null, { status: 504 }));
        return cached || fetched;
      }),
    );
  }
});
