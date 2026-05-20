/* OnVision OS — Service Worker
   Handles: PWA offline shell + Web Push notifications + App Badge
*/

const CACHE_NAME = "onvision-os-v1";
const BADGE_CACHE = "ov-badge-v1";

// ── Badge helpers (uses Cache API as lightweight KV store) ────────────────
async function getBadgeCount() {
  try {
    const cache = await caches.open(BADGE_CACHE);
    const resp = await cache.match("/badge-count");
    if (!resp) return 0;
    return parseInt(await resp.text(), 10) || 0;
  } catch {
    return 0;
  }
}

async function updateBadge(delta) {
  try {
    const cache = await caches.open(BADGE_CACHE);
    const current = await getBadgeCount();
    const next = Math.max(0, current + delta);
    await cache.put("/badge-count", new Response(String(next)));
    if ("setAppBadge" in self.navigator) {
      if (next > 0) self.navigator.setAppBadge(next);
      else self.navigator.clearAppBadge();
    }
    return next;
  } catch {
    return 0;
  }
}

async function clearBadge() {
  try {
    const cache = await caches.open(BADGE_CACHE);
    await cache.put("/badge-count", new Response("0"));
    if ("clearAppBadge" in self.navigator) self.navigator.clearAppBadge();
  } catch {
    // ignore
  }
}

// ── Install: cache the app shell ──────────────────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ── Activate: claim all clients immediately ───────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.url.includes("/api/")) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// ── Push: show notification + increment badge ─────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "OnVision OS", body: event.data.text(), url: "/" };
  }

  event.waitUntil(
    updateBadge(+1).then((count) => {
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
      return self.registration.showNotification(payload.title ?? "OnVision OS", options);
    })
  );
});

// ── Notification click: clear badge + open URL ────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    clearBadge().then(() =>
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
    )
  );
});

// ── Message from app: clear badge when user opens the app ─────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_BADGE") {
    event.waitUntil(clearBadge());
  }
});
