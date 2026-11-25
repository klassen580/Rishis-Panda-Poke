// Rishi's Panda Poke: keeps the app working offline.
const CACHE = 'panda-poke-app-v1';
const PHOTOS = 'panda-poke-photos-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== PHOTOS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(name, max) {
  const c = await caches.open(name), keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // The app itself: try the internet first (so updates arrive), fall back to the saved copy offline.
  if (u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
    return;
  }
  // Fonts: saved once, then used offline.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res;
    })));
    return;
  }
  // Today's panda photos: keep the most recent ones so the paper still has pictures offline.
  if (u.hostname === 'upload.wikimedia.org') {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      const cp = res.clone(); caches.open(PHOTOS).then(c => c.put(r, cp)).then(() => trim(PHOTOS, 80)); return res;
    })));
  }
});
