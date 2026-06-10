const CACHE = 'localsindia-v1';

// Assets to pre-cache on install
const PRECACHE = ['/', '/offline'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, API calls, and Next.js internals
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/auth/')
  ) return;

  // Stale-while-revalidate for HTML pages (city home, search, listing detail)
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached || caches.match('/offline'));
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Cache-first for images (Cloudinary URLs pass through — cross-origin so skipped above)
  if (request.destination === 'image') {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      }))
    );
  }
});
