// Minimal service worker for installability. Intercepts only navigations so
// auth/API requests are never cached; shows a simple offline fallback page.
const OFFLINE_HTML =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Offline</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;text-align:center;color:#111">' +
  '<div><h1 style="color:#2563eb">BridgeX</h1><p>You are offline. Reconnect to continue.</p></div>';

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }),
      ),
    );
  }
});
