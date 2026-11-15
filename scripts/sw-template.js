// Liftbook offline support. Generated into the web build by scripts/make-pwa.mjs; do not edit the copy in dist.
// It only ever stores the app's own files. It never touches what you log: that lives in the browser's own
// storage for this site and is not sent anywhere.
const VERSION = '__VERSION__';
const BASE = '__BASE__';
const FILES = __FILES__;
const CACHE = `liftbook-${VERSION}`;
const SHELL = `${BASE}/index.html`;

self.addEventListener('install', (event) => {
  // Every file of this version is stored before it counts as installed, so offline never gets half an app.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(`${BASE}/${f}`, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  // A new version takes over only once the old one is no longer open, then clears the old files.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('liftbook-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), ms);
  promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(`${BASE}/`)) return;

  if (req.mode === 'navigate') {
    // Opening the app: try the network briefly so updates arrive, then fall back to the stored copy.
    event.respondWith(
      withTimeout(fetch(req), 2500)
        .then((res) => (res.ok ? res : caches.match(SHELL).then((hit) => hit || res)))
        .catch(() => caches.match(SHELL).then((hit) => hit || Response.error())),
    );
    return;
  }
  // App files have their contents in their names, so a stored copy is always the right one.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      }
      return res;
    })),
  );
});
