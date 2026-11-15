// Aether Onefile service worker (Scramjet V1). Lives next to onefile.svg; its scope is that folder.
importScripts("./scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
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
