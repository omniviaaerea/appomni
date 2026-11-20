const CACHE = 'omni-iot-v23';
const PRECACHE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png',
  'supabase.js', 'config.js',
  'flow-universal.webp', 'flow-difficult.webp', 'flow-failed.webp', 'flow-cardiac.webp'];
// páginas e configuração: sempre buscar primeiro na rede (cai para a cópia guardada sem internet)
const NETWORK_FIRST = ['config.js', 'admin.html', 'index.html', 'demo.html', 'privacidade.html', 'manifest.json', 'sw.js'];

self.addEventListener('install', e => {
  // um arquivo faltando não impede a atualização
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(PRECACHE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

function networkFirst(req) {
  return fetch(req, { cache: 'no-store' }).then(res => {
    if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html')));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // servidor (Supabase) e feed externo: sempre rede
  if (url.pathname.endsWith('app-feed.json')) return;     // conteúdo sempre fresco
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || NETWORK_FIRST.some(f => url.pathname.endsWith(f))) {
    e.respondWith(networkFirst(req));
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
