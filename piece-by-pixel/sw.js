const PREFIX = 'piece-by-pixel-';
const CACHE = `${PREFIX}v4`;
const CORE = [
  './',
  'index.html',
  'css/style.css',
  'js/main.js',
  'js/play.js',
  'js/assets.js',
  'js/audio.js',
  'js/store.js',
  'js/icons.js',
  'js/tiers.js',
  'manifest.webmanifest',
  'assets/scenes/index.json',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(CORE);
  const index = await (await cache.match('assets/scenes/index.json')).json();
  await cache.addAll(
    index.scenes.flatMap(({ id }) => ['scene.png', 'data.json', 'data-hard.json', 'data-expert.json', 'data-master.json'].map((f) => `assets/scenes/${id}/${f}`)),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then(async (response) => {
          if (response.ok) await cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      event.waitUntil(network.catch(() => {}));
      return cached || network;
    }),
  );
});
