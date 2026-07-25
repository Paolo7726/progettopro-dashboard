// Service Worker — Progetto Pro Match Scanner
//
// STRATEGIA (v2):
// - HTML (index.html / navigazioni): NETWORK-FIRST. Ogni apertura dell'app
//   scarica sempre l'ultima versione con i dati più recenti (LIVE_DATA
//   aggiornato da engine.py). La cache serve solo come fallback se sei
//   offline — così l'app si aggiorna da sola ad ogni /dashboard, senza
//   bisogno di disinstallare/reinstallare.
// - Asset statici (icone, manifest.json): CACHE-FIRST. Non cambiano quasi
//   mai, quindi si caricano istantaneamente dalla cache.

const CACHE_NAME = 'progettopro-v2';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // Sempre la versione più recente dalla rete. Fallback alla cache solo
    // se sei offline (nessuna connessione).
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Asset statici: cache-first, aggiornata in background per la prossima volta.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
