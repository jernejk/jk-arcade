const CACHE = 'jk-arcade-v2';
const CORE = [
  './', 'index.html', 'launcher.css', 'launcher.js', 'games.json', 'manifest.webmanifest',
  'fonts/Bungee-Regular.ttf', 'icons/icon-192.png', 'icons/favicon-48.png', 'icons/apple-touch-icon.png',
  'shots/piece-by-pixel.webp', 'shots/tumbleverse.webp', 'shots/loose-ends.webp',
  'shots/prism-pop-painter.webp', 'shots/block-loop-shooter.webp', 'shots/curator-of-impossibilities.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('jk-arcade-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (!CORE.includes(path || './')) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});
