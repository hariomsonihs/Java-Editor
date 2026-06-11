const CACHE_NAME = 'java-editor-v5';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './file-manager.js',
  'https://cdnjs.cloudflare.com/ajax/libs/ace/1.23.4/ace.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install - cache files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate - delete old caches immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch - NETWORK FIRST, fallback to cache
// HTML/JS/CSS always fetched fresh from network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isLocalFile = url.origin === self.location.origin;

  if (isLocalFile) {
    // Network first for local files - always get latest
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache first for CDN files (ace.js, font-awesome)
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
