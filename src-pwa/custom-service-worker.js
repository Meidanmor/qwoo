/*
 * This file (your custom service worker)
 * is picked up by the build system ONLY if
 * quasar.config file > pwa > workboxMode is set to "InjectManifest"
 */

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { enable as enableNavigationPreload } from 'workbox-navigation-preload';

enableNavigationPreload();
self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ─── WooCommerce API: products & categories ───────────────────────────────────
registerRoute(
  ({ url }) =>
    (
      url.pathname === '/wp-json/wc/store/v1/products/categories' ||
      (url.pathname === '/wp-json/wc/store/v1/products' && url.searchParams.has('per_page'))
    ),
  new NetworkFirst({
    cacheName: 'woocommerce-api-v2.0',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 })
    ]
  })
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'product-images-v2',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
)

// ─── SEO API ──────────────────────────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.pathname === '/wp-json/qwoo/v1/seo' &&
    url.searchParams.has('path'),
  new NetworkFirst({
    cacheName: 'seo-api-v2.0',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 })
    ]
  })
);

// ─── products.json: StaleWhileRevalidate (large file, scalable) ───────────────
// - Serves from cache instantly if available (good offline)
// - Always revalidates in background (stays fresh)
// - Cache is warmed on first real use, or via the message below
registerRoute(
  ({ url }) => url.pathname === '/data/products.json',
  new StaleWhileRevalidate({
    cacheName: 'static-data-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 60 * 60 * 24  // 1 day
      })
    ]
  })
);

// ─── Background warm-up: client tells SW to cache products.json ───────────────
// Called from your app after first meaningful paint
self.addEventListener('message', async (event) => {
  if (event.data?.type !== 'WARM_PRODUCTS_CACHE') return;

  try {
    const cache = await caches.open('static-data-v1');
    const existing = await cache.match('/data/products.json');
    if (existing) return; // already cached, skip

    const response = await fetch('/data/products.json');
    if (response.ok) {
      await cache.put('/data/products.json', response);
    }
  } catch (err) {
    console.warn('[SW] products.json warm-up failed', err);
  }
});

self.addEventListener('message', async (event) => {
    if (event.data?.type !== 'UPDATE_SW') return;

    try {
        await self.registration.update();
    } catch (err) {
        console.warn('[SW] update check failed', err);
    }
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Push data parse error', e);
  }

  const notification = data.notification || data;

  const options = {
    body: notification.body,
    icon: notification.icon || '/icons/favicon-128x128.png',
    badge: notification.badge || '/icons/favicon-96x96.png',
    data: notification.data || {},
    tag: notification.tag || 'default',
    requireInteraction: notification.requireInteraction ?? true,
    renotify: notification.renotify ?? true,
    vibrate: notification.vibrate || ''
  };

  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const clickUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({ action: 'navigate', url: clickUrl });
          return client.focus();
        }
      }
      return clients.openWindow(clickUrl);
    })
  );
});

// ─── Navigation: Offline-first SSR pages ─────────────────────────────────────
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    const url = new URL(event.request.url)

    try {
      const preloadResponse = await event.preloadResponse
      const networkResponse = preloadResponse || await fetch(event.request)

      if (networkResponse.ok &&
          networkResponse.headers.get('content-type')?.includes('text/html')) {
        const cache = await caches.open('ssr-pages-v1')
        event.waitUntil(cache.put(url.pathname, networkResponse.clone()))
      }

      return networkResponse

    } catch (err) {
      console.warn('[SW] Navigation offline fallback for', url.pathname, err)  // log the error

      const cache = await caches.open('ssr-pages-v1')
      const cachedPage =
        await cache.match(url.pathname) ||
        await cache.match('/') ||
        await cache.match('/index.html')

      if (cachedPage) return cachedPage

      return new Response('Offline', { status: 503 })
    }
  }
)

// service-worker.js
let isOnline = true;

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only check connectivity on external/API requests, ignore same-origin
  const isExternalRequest = url.origin !== self.location.origin;

  if (!isExternalRequest) {
    return; // let the browser handle it normally, don't use it for connectivity
  }

  event.respondWith(
    fetch(event.request).then(response => {
      if (!isOnline) {
        isOnline = true;
        self.clients.matchAll().then(clients =>
          clients.forEach(c => c.postMessage({ type: 'ONLINE' }))
        );
      }
      return response;
    }).catch(err => {
      if (isOnline) {
        isOnline = false;
        self.clients.matchAll().then(clients =>
          clients.forEach(c => c.postMessage({ type: 'OFFLINE' }))
        );
      }
      throw err;
    })
  );
});
