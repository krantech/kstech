/* Alio service worker — makes the tools work offline.
   index.html is always fetched fresh when online (so your updates appear right away)
   and only falls back to the saved copy when there is no internet.
   It also receives push notifications (messages, replies, announcements...) and shows them even when the app is closed.
   Chat notifications are kept as ONE notification per chat: several messages from the same chat are merged into it
   (newest last, with a "4 new messages" count). Different chats stay as separate notifications.
   You normally never need to edit this file. */
const CACHE = 'alio-v12';
const CORE = ['./', './index.html', './quantum-rush-data.js', './catalog.js', './manifest.webmanifest', './icon-192.png', './badge-96.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const EXTRA_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'www.gstatic.com'];
const MAX_LINES = 7;                                   /* how many recent messages one merged notification lists */
const ROUTE_KEYS = ['r', 'p', 'q', 'u', 'to', 'g'];    /* the fields the app uses to open the right screen */

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'alio-diag').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Same site: network first (skips the browser's own cache so new files and the new logo always arrive), saved copy when offline
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
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
/* Pushes are handled one at a time, so two messages arriving together cannot overwrite each other's merged list. */
let pushQueue = Promise.resolve();

/* a tiny diary entry so the app can tell whether the push really reached this phone (no message text is stored) */
function note(d, shown, why) {
  return caches.open('alio-diag').then(c => c.put('./__alio_last_push', new Response(JSON.stringify({ t: Date.now(), shown: shown, why: why || '', tag: d.tag || '' }), { headers: { 'Content-Type': 'application/json' } }))).catch(() => {});
}

/* shows one notification. Chat pushes (d.merge === '1' with a tag) are merged into the chat's existing notification. */
function display(d) {
  const title = d.title || 'Alio';
  const base = { icon: './icon-192.png', badge: './badge-96.png' };
  if (d.merge === '1' && d.tag) {
    return self.registration.getNotifications({ tag: d.tag }).catch(() => []).then(list => {
      const old = (list && list[0] && list[0].data) || {};
      const prev = Array.isArray(old.lines) ? old.lines : [];
      const count = (Number(old.count) || prev.length) + 1;
      const lines = prev.concat([d.l || d.body || '']).slice(-MAX_LINES);   /* oldest first, newest last */
      const heading = count > 1 ? title + ' (' + count + ' new messages)' : title;
      return self.registration.showNotification(heading, Object.assign({}, base, {
        body: lines.join('\n'),
        tag: d.tag,
        renotify: true,                                    /* a new message in an existing chat still makes a sound / buzz */
        data: Object.assign({}, d, { lines: lines, count: count })
      }));
    });
  }
  return self.registration.showNotification(title, Object.assign({}, base, {
    body: d.body || '',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: d
  }));
}

function handlePush(d) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    /* If the app is open and in front, the app already shows it live, so stay quiet (iPhones must always show one). */
    const ios = /iPhone|iPad|iPod/.test(self.navigator.userAgent || '');
    if (!ios && !d.force && list.some(c => c.visibilityState === 'visible' && c.focused)) {
      list.forEach(c => { try { c.postMessage({ ksPushFg: d }); } catch (x) {} });
      return note(d, false, 'app was open in front');
    }
    return display(d).then(() => note(d, true), err => note(d, false, 'error: ' + String(err && err.message || err).slice(0, 80)));
  });
}

self.addEventListener('push', e => {
  let j = {};
  try { j = e.data ? e.data.json() : {}; } catch (x) { try { j = { data: { body: e.data.text() } }; } catch (y) {} }
  const d = Object.assign({}, j.notification || {}, j.data || {});
  pushQueue = pushQueue.then(() => handlePush(d)).catch(() => {});
  e.waitUntil(pushQueue);
});

self.addEventListener('notificationclick', e => {
  const n = e.notification;
  const d = n.data || {};
  n.close();
  /* close only this chat's notification (a merged one is a single notification; this also sweeps any leftover with the same tag) */
  const sweep = d.tag ? self.registration.getNotifications({ tag: d.tag }).then(l => l.forEach(x => x.close())).catch(() => {}) : Promise.resolve();
  const q = new URLSearchParams();
  ROUTE_KEYS.forEach(k => { if (d[k]) q.set('ksp_' + k, d[k]); });
  /* the app only needs the routing fields, not the saved message lines */
  const route = {}; ROUTE_KEYS.forEach(k => { if (d[k]) route[k] = d[k]; });
  e.waitUntil(sweep.then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true })).then(list => {
    for (const c of list) {
      if ('focus' in c) { try { c.postMessage({ ksPush: route }); } catch (x) {} return c.focus(); }
    }
    return self.clients.openWindow('./' + (q.toString() ? '?' + q.toString() : ''));
  }));
});
