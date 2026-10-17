// Service worker dell'app Ausonia: rende l'app più veloce e la fa aprire anche senza rete.
// Quando modifichi l'app, puoi aumentare il numero di versione qui sotto (non è obbligatorio:
// la pagina principale viene comunque ricaricata dalla rete quando c'è connessione).
const CACHE = 'ausonia-v2';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticCdn(url) {
  return (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pagina principale: prima la rete (così vedi subito gli aggiornamenti), se offline la copia salvata
  if (req.mode === 'navigate' || (url.origin === self.location.origin && url.pathname.endsWith('.html'))) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Icone, manifest, librerie Firebase e font: copia salvata subito, aggiornata in background
  if (url.origin === self.location.origin || isStaticCdn(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = await c.match(req);
        const network = fetch(req)
          .then((resp) => { if (resp.ok || resp.type === 'opaque') c.put(req, resp.clone()); return resp; })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
  // Tutto il resto (database, login, Worker AI) passa direttamente dalla rete
});
