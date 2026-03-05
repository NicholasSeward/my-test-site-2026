const CACHE_NAME = 'frogs-pwa-v1';
const urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/frog.jpg'
];

// Install event: cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  let requestUrl = new URL(event.request.url);
  
  // For navigation requests to root, serve index.html
  if (event.request.mode === 'navigate' && requestUrl.pathname === '/') {
    event.respondWith(
      caches.match('/index.html')
        .then(response => response || fetch('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Return cached index.html as fallback for offline navigation
        return caches.match('/index.html')
          .then(response => response || new Response('Offline - page not cached', {status: 503}));
      })
  );
});
