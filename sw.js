// v2: added real runtime caching (see fetch handler below). Previously, only the
// files listed in ASSETS_TO_CACHE were ever cached - everything else, including the
// face-api.js AI MODEL WEIGHT FILES (several MB, fetched at runtime from the CDN),
// was re-downloaded from the network on every single visit. That repeated multi-MB
// download is very likely the main reason face recognition felt slow to start -
// now those files are cached the first time and served instantly after that.
const CACHE_NAME = 'sitepunch-v2';
const ASSETS_TO_CACHE = [
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Remove any old-versioned caches (e.g. from before this update) so stale
    // assets can't linger around and take up space.
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return; // Never cache POST (e.g. attendance sync calls)

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse; // Cache First for anything we've already seen

            return fetch(event.request).then((networkResponse) => {
                // RUNTIME CACHING: save a copy of anything successfully fetched (model
                // files, fonts, etc.) so the next visit reads it straight from cache
                // instead of downloading it all over again.
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            }).catch(() => cachedResponse); // Offline and not cached - nothing more we can do
        })
    );
});
