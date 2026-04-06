// ExpenseFlow Service Worker
// Cache version — bump this to invalidate old caches
const CACHE_NAME = "expenseflow-v1";
const STATIC_CACHE = "expenseflow-static-v1";
const API_CACHE = "expenseflow-api-v1";

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.json",
  "/favicon.ico",
];

// URL patterns for different caching strategies
const API_PATTERNS = [
  /\/rest\/v1\//,
  /supabase\.co\/rest/,
  /supabase\.co\/auth/,
  /\/api\//,
];

const STATIC_PATTERNS = [
  /\.(js|css|woff2?|ttf|otf|eot)$/,
  /\/_next\/static\//,
  /\/_next\/image/,
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch (err) {
        console.warn("[SW] Pre-cache failed for some URLs:", err);
      }
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(
            (name) =>
              name !== CACHE_NAME &&
              name !== STATIC_CACHE &&
              name !== API_CACHE
          )
          .map((name) => caches.delete(name))
      );
      // Take control of all clients
      await self.clients.claim();
    })()
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching (handle separately for background sync)
  if (request.method !== "GET") {
    event.respondWith(handleNonGetRequest(request));
    return;
  }

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith("http")) return;

  // API requests: Network-first, fall back to cache
  if (API_PATTERNS.some((p) => p.test(request.url))) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets: Cache-first, fall back to network
  if (STATIC_PATTERNS.some((p) => p.test(request.url))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigation requests: Network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// ── Cache Strategies ──────────────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch {
    return new Response("Asset not available offline", { status: 503 });
  }
}

async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch {
    // Try cached version of the requested URL
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fall back to offline page
    const offlinePage = await caches.match("/offline");
    return (
      offlinePage ||
      new Response(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline — ExpenseFlow</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0a1a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
    .container { text-align: center; max-width: 400px; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: #f8fafc; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 1.5rem; }
    button { background: #7c3aed; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #6d28d9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're offline</h1>
    <p>ExpenseFlow needs an internet connection to load. Please check your connection and try again.</p>
    <button onclick="location.reload()">Try again</button>
  </div>
</body>
</html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      )
    );
  }
}

// ── Background Sync ───────────────────────────────────────────────────────────

const SYNC_QUEUE_KEY = "expenseflow-sync-queue";

async function handleNonGetRequest(request) {
  try {
    return await fetch(request);
  } catch {
    // Queue failed API mutation for background sync
    if (
      request.url.includes("/rest/v1/") ||
      request.url.includes("/api/")
    ) {
      const body = await request.text().catch(() => "");
      await queueFailedRequest({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body,
        timestamp: Date.now(),
      });

      return new Response(
        JSON.stringify({ queued: true, message: "Request queued for sync" }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response("Network Error", { status: 503 });
  }
}

async function queueFailedRequest(requestData) {
  const allClients = await self.clients.matchAll();
  // Notify clients that a request was queued
  allClients.forEach((client) => {
    client.postMessage({
      type: "REQUEST_QUEUED",
      data: requestData,
    });
  });
}

self.addEventListener("sync", (event) => {
  if (event.tag === "expenseflow-sync") {
    event.waitUntil(replayQueuedRequests());
  }
});

async function replayQueuedRequests() {
  const allClients = await self.clients.matchAll();
  allClients.forEach((client) => {
    client.postMessage({ type: "SYNC_STARTED" });
  });
}

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "ExpenseFlow", body: event.data.text() };
  }

  const title = data.title || "ExpenseFlow";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    tag: data.tag || "expenseflow-notification",
    data: data.data || {},
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen =
    event.notification.data?.url || "/dashboard";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          client.navigate(urlToOpen);
          client.focus();
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

// ── Message Handler ───────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "VERSION", version: CACHE_NAME });
  }
});
