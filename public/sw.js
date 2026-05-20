/* OnVision OS — Service Worker
   Handles: PWA offline shell + Web Push notifications
*/

const CACHE_NAME = "onvision-os-v1";

// ── Install: cache the app shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ── Activate: claim all clients immediately ───────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────
self.addEventListener("fetch", (event) => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Skip API routes — always network
  if (event.request.url.includes("/api/")) return;
  // Default: network first
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// ── Push: show notification ───────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "OnVision OS", body: event.data.text(), url: "/" };
  }

  const options = {
    body: payload.body ?? "",
    icon: "/onvision-mark.png",
    badge: "/onvision-mark.png",
    tag: payload.tag ?? "onvision-general",
    renotify: true,
    data: { url: payload.url ?? "/dashboard" },
    actions: [
      { action: "open", title: "Otevřít" },
      { action: "dismiss", title: "Zavřít" },
    ],
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "OnVision OS", options)
  );
});

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
