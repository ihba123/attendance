const CACHE_NAME = 'sitepunch-v3';

// Strict local assets
const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// External CDNs cached safely in no-cors mode
const EXTERNAL_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // 1. Cache local files strictly
            await cache.addAll(LOCAL_ASSETS).catch(err => console.warn('Local cache skipped:', err));
            
            // 2. Cache external CDNs safely without breaking if CORS fails
            await Promise.allSettled(
                EXTERNAL_ASSETS.map(url => 
                    fetch(url, { mode: 'no-cors' })
                        .then(response => cache.put(url, response))
                        .catch(err => console.warn('External asset skipped:', url, err))
                )
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            }).catch(() => cachedResponse);
        })
    );
});
