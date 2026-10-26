/* Alio service worker — makes the tools work offline.
   index.html is always fetched fresh when online (so your updates appear right away)
   and only falls back to the saved copy when there is no internet.
   It also receives push notifications (messages, replies, announcements...) and shows them even when the app is closed.
   You normally never need to edit this file. */
const CACHE = 'alio-v7';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const EXTRA_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'www.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Same site: network first, saved copy when offline
    e.respondWith(fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined) || Response.error())));
  } else if (EXTRA_HOSTS.includes(url.hostname)) {
    // Fonts / PDF library / Firebase code: saved copy first, refreshed in the background
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => hit || Response.error());
      return hit || net;
    }));
  }
});

/* ---------- Push notifications ---------- */
self.addEventListener('push', e => {
  let j = {};
  try { j = e.data ? e.data.json() : {}; } catch (x) { try { j = { data: { body: e.data.text() } }; } catch (y) {} }
  const d = Object.assign({}, j.notification || {}, j.data || {});
  const title = d.title || 'Alio';
  const opts = {
    body: d.body || '',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: d
  };
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    /* If the app is open and in front, the app already shows it live, so stay quiet (iPhones must always show one). */
    const ios = /iPhone|iPad|iPod/.test(self.navigator.userAgent || '');
    if (!ios && !d.force && list.some(c => c.visibilityState === 'visible' && c.focused)) {
      list.forEach(c => { try { c.postMessage({ ksPushFg: d }); } catch (x) {} });
      return;
    }
    return self.registration.showNotification(title, opts);
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const q = new URLSearchParams();
  ['r', 'p', 'q', 'u', 'to'].forEach(k => { if (d[k]) q.set('ksp_' + k, d[k]); });
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ('focus' in c) { try { c.postMessage({ ksPush: d }); } catch (x) {} return c.focus(); }
    }
    return self.clients.openWindow('./' + (q.toString() ? '?' + q.toString() : ''));
  }));
});
