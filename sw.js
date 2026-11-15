// Aether Onefile service worker (Scramjet V1). Lives next to onefile.svg; its scope is that folder.
importScripts("./scram/scramjet.all.js");

// Scramjet 1.1.0 bug: a "loadConfig" message from the page sets the config only halfway, which
// makes every proxied request fail ("reading 'prefix'"). Ignore it; the worker reads the config
// from its database instead. (This listener must be added before ScramjetServiceWorker's.)
self.addEventListener("message", (event) => {
  if (event.data && event.data.scramjet$type === "loadConfig") event.stopImmediatePropagation();
});

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const SCOPE = new URL("./", self.location.href).pathname;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// jsDelivr / staticdelivr serve .html files as text/plain, so games would show as source code.
// Re-serve our own HTML files (activities etc.) with a real HTML content type.
function isOwnHtml(url) {
  return url.origin === self.location.origin &&
    url.pathname.startsWith(SCOPE) &&
    !url.pathname.startsWith(SCOPE + "scramjet/") &&
    /\.html?$/i.test(url.pathname);
}

async function serveHtml(request) {
  const res = await fetch(request.url, { credentials: "same-origin", cache: "no-cache" });
  if (!res.ok) return res;
  return new Response(await res.arrayBuffer(), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && isOwnHtml(url)) {
    event.respondWith(serveHtml(event.request).catch(() => fetch(event.request)));
    return;
  }
  // Only proxy URLs (and Scramjet's wasm, which it serves wrapped as JS) go through Scramjet.
  if (!url.pathname.startsWith(SCOPE + "scramjet/") && url.pathname !== SCOPE + "scram/scramjet.wasm.wasm") return;
  event.respondWith((async () => {
    try {
      await scramjet.loadConfig();
      if (scramjet.route(event)) return await scramjet.fetch(event);
    } catch (e) {
      console.error("Aether Onefile SW:", e);
    }
    return fetch(event.request);
  })());
});