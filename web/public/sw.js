/* Service worker mínimo — o Chrome exige um listener "fetch" para oferecer
 * "Instalar app". NÃO use respondWith(fetch()): no Safari/iPhone isso quebra
 * vídeos (Range), /uploads, thumbs e uploads grandes com:
 *   FetchEvent.respondWith received an error: TypeError: Load failed
 *
 * Versão: 3 — sem interceptação de rede.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intencionalmente vazio: a rede nativa atende o pedido.
});
