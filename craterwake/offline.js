// Keep a visited cabinet playable when the harbour goes offline.
const CACHE = 'craterwake-static-v2-6';
const ROOT = new URL('./', self.location.href);
const FILES = [
  './',
  'index.html',
  'style.css',
  'favicon.svg',
  'assets/cover.webp',
  'assets/key-art.webp',
  'assets/pebble.webp',
  'assets/corkscrew.webp',
  'assets/gull.webp',
  'assets/skipper.webp',
  'vendor/three.module.min.js',
  '../fonts/Bungee-Regular.ttf',
  ...[
    'world',
    'tank',
    'destruction',
    'salvo-effects',
    'duel',
    'mesher',
    'mesh-worker',
    'scene',
    'toys',
    'audio',
    'main',
  ].map((name) => 'src/' + name + '.js'),
];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(FILES.map((file) => new URL(file, ROOT).href)),
      )
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith('craterwake-static-') && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== ROOT.origin) return;
  if (!FILES.some((file) => new URL(file, ROOT).pathname === url.pathname))
    return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      return hit || fetch(req);
    }),
  );
});
