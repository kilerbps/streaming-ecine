/* Service worker E-Ciné (docs/skills/ecine-pwa-mobile-feel.md).
 * - Ressources statiques versionnées (/_next/static, polices, icônes) : cache d'abord.
 * - Navigation : réseau uniquement, page hors ligne en secours.
 * - JAMAIS en cache : vidéo (segments, playlists, clés), API, pages HTML (contenu personnalisé),
 *   actions serveur. À la déconnexion, tous les caches sont purgés.
 */
const STATIC_CACHE = 'ecine-static-v1';
const OFFLINE_CACHE = 'ecine-offline-v1';
const OFFLINE_URL = '/fr/hors-ligne';
const STATIC_MAX_ENTRIES = 250;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n !== STATIC_CACHE && n !== OFFLINE_CACHE)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'ECINE_LOGOUT') {
    // Aucune réponse privée n'est mise en cache ; purge par précaution des caches d'exécution.
    event.waitUntil(
      caches
        .keys()
        .then((names) =>
          Promise.all(names.filter((n) => n !== OFFLINE_CACHE).map((n) => caches.delete(n))),
        ),
    );
  }
});

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/icon.svg')
  );
}

async function trimCache(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - STATIC_MAX_ENTRIES)))
    await cache.delete(key);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE })) ?? Response.error(),
      ),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          await cache.put(request, response.clone());
          void trimCache(cache);
        }
        return response;
      }),
    );
  }
  // Tout le reste (API, médias protégés, images distantes, données RSC) : réseau, sans cache du worker.
});
