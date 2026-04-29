// Service Worker for Workout Log PWA
const CACHE_VERSION = 'v8';
const CACHE_NAME = `workout-log-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/styles.css',
    '/assets/scripts/app.js',
    '/assets/scripts/Dashboard.js',
    '/assets/scripts/EntryModal.js',
    '/assets/scripts/Persistence.js',
    '/assets/scripts/Utilities.js',
    '/assets/scripts/WorkoutEntry.js',
    '/assets/scripts/WorkoutLog.js',
    '/assets/scripts/WorkoutLogEditor.js',
    '/assets/scripts/WorkoutLogViewer.js',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching app shell assets...');
                return cache.addAll(ASSETS_TO_CACHE.map(url => {
                    // Only cache URLs that exist; others will fail gracefully
                    return fetch(url)
                        .then(response => {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                        })
                        .catch(err => {
                            console.warn(`Failed to cache ${url}:`, err);
                        });
                }));
            })
            .then(() => {
                console.log('App shell assets cached, skipping waiting...');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Error during service worker installation:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return cacheName.startsWith('workout-log-') && cacheName !== CACHE_NAME;
                    })
                    .map((cacheName) => {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        })
            .then(() => {
                console.log('Old caches cleaned up, claiming clients...');
                return self.clients.claim();
            })
    );
});

// Fetch event - network-first strategy for code, cache-first for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Determine strategy based on request type
    const isScript = request.url.includes('/assets/scripts/') || request.url.endsWith('.js');
    const isStyle = request.url.includes('/assets/css/') || request.url.endsWith('.css');
    const isData = request.url.includes('/assets/data/') || request.url.endsWith('.txt');
    const isIcon = request.url.includes('/assets/icons/') || request.url.includes('icon-');

    if (isScript || isStyle) {
        // Network-first for code (get latest, fallback to cache)
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Good response - update cache and return
                    if (response.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, response.clone());
                        });
                        return response;
                    }
                    // Bad response - try cache
                    return caches.match(request);
                })
                .catch(() => {
                    // Network failed - try cache
                    return caches.match(request).then((response) => {
                        return response || new Response('Offline - asset not cached', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
                })
        );
    } else if (isData) {
        // Network-first for data (always try to get fresh data)
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, response.clone());
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Network failed - try cache
                    return caches.match(request).then((response) => {
                        return response || new Response('', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
                })
        );
    } else if (isIcon) {
        // Cache-first for icons (static assets)
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request)
                    .then((response) => {
                        if (response.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, response.clone());
                            });
                        }
                        return response;
                    });
            })
        );
    } else {
        // Default: cache-first for HTML documents
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request)
                    .then((response) => {
                        if (response.ok && (request.mode === 'navigate' || response.headers.get('content-type')?.includes('text/html'))) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, response.clone());
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return offline page or cached version
                        return caches.match('/index.html') || new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
        );
    }
});

// Message event - handle update notifications
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Check for updates periodically
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CHECK_FOR_UPDATES') {
        console.log('Checking for updates...');
        // Service worker will recache assets on next fetch after update
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                if (cacheName.startsWith('workout-log-')) {
                    console.log('Update cache found:', cacheName);
                }
            });
        });
    }
});
