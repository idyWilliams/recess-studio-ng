/**
 * Recess Studio — Progressive Web App Service Worker
 * Provides offline app-shell caching, lock-screen turn notification handling,
 * and direct window-focusing when tapping OS notifications.
 */

const CACHE_NAME = 'recess-shell-v1';

// Core shell assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/games',
  '/friends',
  '/leaderboard',
  '/assets/shared/icons/recess-coin.svg',
  '/assets/shared/icons/icon-whatsapp.svg',
  '/assets/games/banners/word-battle.svg',
  '/assets/games/banners/mancala-royale.svg',
  '/assets/games/banners/whot.svg',
  '/assets/games/banners/ludo.svg',
  '/assets/shared/avatars/avatar-chidi.svg',
  '/assets/shared/avatars/avatar-tunde.svg',
  '/assets/shared/avatars/avatar-amina.svg',
  '/assets/shared/avatars/avatar-efe.svg',
];

// Install: pre-cache critical shell assets with fault-tolerance
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Use allSettled so one missing banner doesn't break the entire SW install
      await Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to pre-cache:', url, err);
          }),
        ),
      );
      return self.skipWaiting();
    }),
  );
});

// Activate: clean up older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        }),
      ),
    ).then(() => self.clients.claim()),
  );
});

// Fetch: Network-first for navigation, Cache-first for assets, Network-only for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Never cache API or tunnel proxy requests — always fresh server authoritative state
  if (
    url.pathname.startsWith('/backend-api/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/players/') ||
    url.pathname.startsWith('/game-sessions/') ||
    url.pathname.includes('/_next/webpack-hmr')
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-First with cached fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, clone and update cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback: try exact page from cache, then fallback to root shell
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/');
          if (shell) return shell;
          return new Response(
            '<!DOCTYPE html><html><body style="background:#05070B;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h1>Recess Studio</h1><p>You appear to be offline. Please reconnect to continue your match.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } },
          );
        }),
    );
    return;
  }

  // 2. Static Assets (SVGs, CSS, JS, fonts): Stale-While-Revalidate
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
  }
});

// Notification Click Handler: Focus existing PWA window or launch directly in fullscreen Home Screen app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Look for any existing client already open
        for (const client of windowClients) {
          const clientUrl = new URL(client.url);
          // If matching or already on Recess origin, focus it and navigate
          if ('focus' in client) {
            if (clientUrl.pathname === new URL(targetUrl, self.location.origin).pathname) {
              return client.focus();
            }
            if ('navigate' in client) {
              return client.focus().then(() => client.navigate(targetUrl));
            }
            return client.focus();
          }
        }

        // If no matching window is open, open a new window directly into the PWA
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
