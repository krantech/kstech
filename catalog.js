/* ════════════════════════════════════════════════════════════════════
   Alio — catalog.js
   1) Account sync for Notes & To-do (cross-device, offline-first)
   2) Catalog — your private library of saved texts (prompts, disclaimers…)

   Needs the small bridge in index.html that sets window.KSCore
   ({db, fs, onUser, user}). Firestore path used for everything:
       userSync/{uid}/items/{id}    (owner-only, see rules)
       catalogJams/{jid}[/items/{id}] + catalogJamJoins/{jid~uid}   (Jams: any number per person, each a Catalog shared by up to 20 people)
   Doc shape: {k, d, u, s, x}
       k = kind  n note · t todo · b bin · c catalog text · f folders · g catalog categories
       d = the item as a JSON string      u = last edit (ms)
       s = server timestamp (for cheap "only what changed" pulls)
       x = true when the item was deleted (tombstone)
   ════════════════════════════════════════════════════════════════════ */
(function () {
"use strict";
if (window.__ksCatalogLoaded) return;
window.__ksCatalogLoaded = 1;
var C = window.KSCore;
if (!C || !C.db || !C.fs) { try { console.warn('[catalog] KSCore bridge missing'); } catch (e) {} return; }
var fs = C.fs, db = C.db, LS = window.localStorage;

/* ───────────── shared helpers ───────────── */
var RE_ID = /^[A-Za-z0-9_-]{1,40}$/;
var KEYS = { n: 'ks_notes_v1', t: 'ks_todos_v1', b: 'ks_notes_trash_v1', c: 'ks_catalog_v1' };
var SINGLE = { f: { key: 'ks_notes_folders_v1', id: '_folders' }, g: { key: 'ks_catalog_cats_v1', id: '_catcats' } };
var WATCH = {};
Object.keys(KEYS).forEach(function (k) { WATCH[KEYS[k]] = 1; });
Object.keys(SINGLE).forEach(function (k) { WATCH[SINGLE[k].key] = 1; });
var MAXD = { c: 14000, def: 100000 };

var rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
var applying = 0;
function rd(k) { try { return JSON.parse(LS.getItem(k) || '[]'); } catch (e) { return []; } }
function rda(k) { var a = rd(k); return Array.isArray(a) ? a : []; }
function wr(k, v) { applying++; try { rawSet.call(LS, k, JSON.stringify(v)); } catch (e) {} applying--; }
function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length.toString(36); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function toast(m, type) { try { window.ksToast(m, { type: type }); } catch (e) {} }
function str(v, n) { return (typeof v === 'string' ? v : '').slice(0, n); }
/* admin feature flags: ON unless the admin switched them off (admins themselves always pass) */
function flagOn(k) { try { return typeof window.ksFlagOn === 'function' ? !!window.ksFlagOn(k) : true; } catch (e) { return true; } }
function editOn() { return flagOn('cat_edit'); }
function backupOn() { return flagOn('cat_backup'); }
function offMsg() { toast('The site admin has turned this off for now.', 'err'); }

/* ═════════════════ 1) SYNC ENGINE ═════════════════ */
var user = null, meta = null, unsub = null, timer = null, firstDirty = 0;
var busy = false, ready = false, status = 'out', bigWarned = {}, statusCbs = [];

function setStatus(s) { status = s; statusCbs.slice().forEach(function (f) { try { f(s); } catch (e) {} }); }
function onStatus(f) { statusCbs.push(f); return function () { statusCbs = statusCbs.filter(function (x) { return x !== f; }); }; }
function mkey(u) { return 'ks_sync_meta_v1_' + u; }
function loadMeta(u) {
  try { var m = JSON.parse(LS.getItem(mkey(u)) || 'null'); if (m && m.items) return m; } catch (e) {}
  return { pull: 0, items: {}, fresh: true };
}
function saveMeta() { if (!user) return; try { delete meta.fresh; rawSet.call(LS, mkey(user.uid), JSON.stringify(meta)); } catch (e) {} }

function localMap() {
  var map = {};
  ['n', 't', 'b', 'c'].forEach(function (k) {
    rda(KEYS[k]).forEach(function (it) {
      if (!it || typeof it !== 'object' || typeof it.id !== 'string' || !RE_ID.test(it.id)) return;
      if ((k === 'n' || k === 'b') && !it.t && !it.b) return;      /* never-typed notes */
      map[it.id] = { k: k, d: JSON.stringify(it), u: +it.u || 0 };
    });
  });
  Object.keys(SINGLE).forEach(function (k) {
    var a = rda(SINGLE[k].key);
    map[SINGLE[k].id] = { k: k, d: JSON.stringify(a), u: 0, empty: !a.length };
  });
  return map;
}
function eh(e) { return hash(e.k + e.d); }

function scan() {
  var map = localMap(), dirty = [], gone = [], now = Date.now();
  Object.keys(map).forEach(function (id) {
    var e = map[id], h = eh(e), m = meta.items[id];
    if (m && m.h === h && !m.x) return;
    if (!m && e.empty) return;                                   /* empty singleton, nothing to sync */
    var mm = meta.items[id] = m || {};
    if (mm.dh !== h) { mm.dh = h; mm.lu = e.u || now; }
    dirty.push(id);
  });
  Object.keys(meta.items).forEach(function (id) {
    var m = meta.items[id];
    if (!map[id] && !m.x && m.h) gone.push(id);
  });
  return { map: map, dirty: dirty, gone: gone };
}

function externalWipe() {   /* data keys removed from outside the app (site data cleared) → restore from cloud */
  return LS.getItem(KEYS.n) === null && LS.getItem(KEYS.t) === null && Object.keys(meta.items).length > 5;
}

async function push() {
  if (!user || !ready || busy || !flagOn('sync_cloud')) return;
  busy = true;
  var u = user.uid;
  try {
    if (externalWipe()) { meta = { pull: 0, items: {} }; saveMeta(); busy = false; startListen(); return; }
    var s = scan();
    if (!s.dirty.length && !s.gone.length) { setStatus(navigator.onLine ? 'ok' : 'off'); busy = false; return; }
    setStatus('sync');
    var ops = [], now = Date.now();
    s.dirty.forEach(function (id) {
      var e = s.map[id], lim = MAXD[e.k] || MAXD.def;
      if (e.d.length > lim) {
        if (!bigWarned[id]) { bigWarned[id] = 1; toast('One item is too long to sync and stays on this device only.', 'err'); }
        return;
      }
      ops.push({ id: id, e: e, data: { k: e.k, d: e.d, u: meta.items[id].lu || now, s: fs.serverTimestamp(), x: false } });
    });
    s.gone.forEach(function (id) {
      ops.push({ id: id, gone: true, data: { k: meta.items[id].k || 'n', d: '', u: now, s: fs.serverTimestamp(), x: true } });
    });
    for (var i = 0; i < ops.length; i += 400) {
      var chunk = ops.slice(i, i + 400), b = fs.writeBatch(db);
      chunk.forEach(function (o) { b.set(fs.doc(db, 'userSync', u, 'items', o.id), o.data); });
      await b.commit();
      if (!user || user.uid !== u) { busy = false; return; }
      chunk.forEach(function (o) {
        if (o.gone) meta.items[o.id] = { x: 1, h: 'x', k: o.data.k };
        else meta.items[o.id] = { h: eh(o.e), k: o.e.k };
      });
      saveMeta();
    }
    setStatus('ok');
  } catch (err) {
    setStatus(navigator.onLine ? 'err' : 'off');
  }
  busy = false;
  var again = scan();
  if (again.dirty.length || again.gone.length) { if (status !== 'err' && status !== 'off') pushSoon(1500); }
}

function pushSoon(ms) {
  if (!user || !ready) return;
  var now = Date.now();
  if (!firstDirty) firstDirty = now;
  clearTimeout(timer);
  var wait = Math.min(ms, Math.max(0, firstDirty + 30000 - now));
  timer = setTimeout(function () { firstDirty = 0; push(); }, wait);
}

function emit(key) { try { window.dispatchEvent(new StorageEvent('storage', { key: key })); } catch (e) {} }

function applyRemote(docs) {
  var lists = {}, singles = {}, changed = {}, touched = {};
  ['n', 't', 'b', 'c'].forEach(function (k) { lists[k] = rda(KEYS[k]); });
  Object.keys(SINGLE).forEach(function (k) { singles[k] = rda(SINGLE[k].key); });
  var map = localMap();
  function dropId(id) {
    ['n', 't', 'b', 'c'].forEach(function (k) {
      var before = lists[k].length;
      lists[k] = lists[k].filter(function (x) { return !(x && x.id === id); });
      if (lists[k].length !== before) changed[KEYS[k]] = 1;
    });
  }
  docs.forEach(function (r) {
    var id = r.id, v = r.data, m = meta.items[id], e = map[id];
    if (!v || typeof v.u !== 'number' || typeof v.k !== 'string') return;
    var h = e ? eh(e) : null;
    var dirty = e ? (!m || m.h !== h) : !!(m && !m.x && m.h);   /* edited, new, or deleted locally and not pushed yet */
    if (dirty) { var lu = (m && m.lu) || (e && e.u) || 0; if (!(v.u > lu)) return; }
    if (v.x) {
      if (SINGLE[v.k]) return;
      dropId(id);
      meta.items[id] = { x: 1, h: 'x', k: v.k };
      return;
    }
    if (SINGLE[v.k]) {
      if (SINGLE[v.k].id !== id) return;
      var arr; try { arr = JSON.parse(v.d); } catch (er) { return; }
      if (!Array.isArray(arr)) return;
      if (JSON.stringify(arr) !== JSON.stringify(singles[v.k])) { singles[v.k] = arr; changed[SINGLE[v.k].key] = 1; }
      meta.items[id] = { h: null, k: v.k }; touched[id] = 1;
      return;
    }
    if (!KEYS[v.k] || !RE_ID.test(id)) return;
    if (e && !dirty && hash(v.k + v.d) === h) { meta.items[id] = { h: h, k: v.k }; return; }
    var item; try { item = JSON.parse(v.d); } catch (er2) { return; }
    if (!item || typeof item !== 'object' || item.id !== id) return;
    dropId(id);
    lists[v.k].push(item); changed[KEYS[v.k]] = 1;
    meta.items[id] = { h: null, k: v.k }; touched[id] = 1;
  });
  var keys = Object.keys(changed);
  keys.forEach(function (key) {
    var found = false;
    Object.keys(KEYS).forEach(function (k) { if (KEYS[k] === key) { wr(key, lists[k]); found = true; } });
    if (!found) Object.keys(SINGLE).forEach(function (k) { if (SINGLE[k].key === key) wr(key, singles[k]); });
  });
  var map2 = localMap();
  Object.keys(touched).forEach(function (id) {
    if (map2[id]) meta.items[id].h = eh(map2[id]); else delete meta.items[id];
  });
  keys.forEach(emit);
  if (keys.length && typeof ctRefresh === 'function') ctRefresh();
}

function stopListen() { if (unsub) { try { unsub(); } catch (e) {} unsub = null; } }
function startListen() {
  stopListen();
  if (!user) return;
  setStatus('sync');
  var q = fs.query(fs.collection(db, 'userSync', user.uid, 'items'), fs.where('s', '>=', fs.Timestamp.fromMillis(meta.pull || 0)));
  var u = user.uid;
  unsub = fs.onSnapshot(q, function (snap) {
    if (!user || user.uid !== u) return;
    var docs = [], maxS = meta.pull || 0;
    snap.docChanges().forEach(function (ch) {
      if (ch.type === 'removed') return;
      var dd = ch.doc;
      if (dd.metadata.hasPendingWrites) return;
      var data = dd.data();
      docs.push({ id: dd.id, data: data });
      var sm = data.s && data.s.toMillis ? data.s.toMillis() : 0;
      if (sm > maxS) maxS = sm;
    });
    if (docs.length) applyRemote(docs);
    meta.pull = maxS; saveMeta();
    if (!snap.metadata.fromCache) { ready = true; setStatus('ok'); pushSoon(300); }
    else if (!navigator.onLine) setStatus('off');
  }, function () { setStatus(navigator.onLine ? 'err' : 'off'); });
}

function anyLocalData() {
  return ['n', 't', 'b', 'c'].some(function (k) { return rda(KEYS[k]).length > 0; });
}
function wipeLocalAfterBackup() {
  try {
    var bk = {};
    Object.keys(KEYS).forEach(function (k) { bk[KEYS[k]] = LS.getItem(KEYS[k]); });
    Object.keys(SINGLE).forEach(function (k) { bk[SINGLE[k].key] = LS.getItem(SINGLE[k].key); });
    rawSet.call(LS, 'ks_sync_backup_v1', JSON.stringify(bk));
  } catch (e) {}
  Object.keys(KEYS).forEach(function (k) { wr(KEYS[k], []); emit(KEYS[k]); });
  Object.keys(SINGLE).forEach(function (k) { wr(SINGLE[k].key, []); emit(SINGLE[k].key); });
}

function begin(u) {
  user = u; meta = loadMeta(u.uid); ready = false; bigWarned = {};
  var last = LS.getItem('ks_sync_last_uid');
  function go() {
    try { rawSet.call(LS, 'ks_sync_last_uid', u.uid); } catch (e) {}
    if (!flagOn('sync_cloud')) { setStatus('paused'); return; }
    startListen();
  }
  setTimeout(function () { try { if (user && user.uid === u.uid) jamStart(); } catch (e) {} }, 0);   /* after the whole file has initialised */
  if (meta.fresh && last && last !== u.uid && anyLocalData() && typeof window.ksAsk === 'function') {
    setStatus('wait');
    window.ksAsk('The notes, tasks and texts on this device were last synced with a different account. Add them to this account, or start fresh with only this account\'s data?', go, {
      title: 'Different account', okText: 'Add to this account', cancelText: 'Start fresh', danger: false,
      onNo: function () { wipeLocalAfterBackup(); go(); }
    });
  } else go();
}
function end() {
  stopListen(); clearTimeout(timer); try { if (typeof J !== 'undefined' && J) jamStop(); } catch (e) {}
  user = null; meta = null; ready = false; setStatus('out');
}

Storage.prototype.setItem = function (k) {
  var r = rawSet.apply(this, arguments);
  if (this === LS && WATCH[k] && !applying) pushSoon(4000);
  return r;
};
Storage.prototype.removeItem = function (k) {
  var r = rawRemove.apply(this, arguments);
  if (this === LS && WATCH[k] && !applying) pushSoon(4000);
  return r;
};
window.addEventListener('online', function () { if (user) { if (!unsub) startListen(); else pushSoon(500); } });
window.addEventListener('offline', function () { if (user) setStatus('off'); });
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && user && ready) { clearTimeout(timer); firstDirty = 0; push(); } });

C.onUser(function (fbUser) {
  if (fbUser && (!user || user.uid !== fbUser.uid)) { if (user) end(); begin(fbUser); }
  else if (!fbUser && user) end();
  else if (!fbUser) setStatus('out');
});
/* react live when the admin flips a flag (index.html calls applyFeatureFlagUI on every change) */
function onFlags() {
  if (user) {
    if (!flagOn('sync_cloud')) { if (unsub || ready) { stopListen(); clearTimeout(timer); ready = false; setStatus('paused'); } }
    else if (!unsub && status === 'paused' && meta) startListen();
  }
  try { if (user) { if (!flagOn('cat_jam')) jamStop(); else if (!J.uD) jamStart(); } } catch (e) {}
  if (document.getElementById('ctBody')) { built = false; paint(); }
}
(function hookFlags() {
  var o = window.applyFeatureFlagUI;
  if (typeof o === 'function' && !o.__ct) {
    var w = function () { var r = o.apply(this, arguments); try { onFlags(); } catch (e) {} return r; };
    w.__ct = 1; window.applyFeatureFlagUI = w;
  }
})();
window.KSSync = { status: function () { return status; }, onStatus: onStatus, syncNow: function () { pushSoon(0); } };

/* ═════════════════ Notes page: honest storage notice ═════════════════ */
function notesBanner() {
  var el = document.querySelector('#ntRoot .nt-priv');
  if (!el) return;
  var s = status, txt;
  if (s === 'out' || !user) {
    txt = "<span aria-hidden='true'>🔒</span><span><b>Saved on this device only.</b> Sign in to sync your notes and tasks across all your devices. Until then, clearing site data erases them. Use Backup to keep a copy.</span>";
  } else {
    var st = s === 'paused' ? 'Cloud sync is paused by the site admin; changes stay on this device for now.' : s === 'sync' ? 'Syncing…' : s === 'off' ? 'Offline — will sync when you\'re back online.' : s === 'err' ? 'Sync problem — will retry.' : s === 'wait' ? 'Waiting for your choice…' : 'All changes synced.';
    txt = "<span aria-hidden='true'>☁️</span><span><b>" + (s === 'paused' ? 'Sync paused.' : 'Synced to your account.') + "</b> " + st + " Notes and tasks are saved here and backed up to your Alio account, private to you. They're not end-to-end encrypted, so don't store passwords or card numbers.</span>";
  }
  el.innerHTML = txt;
}
(function hookNotes() {
  var a = (typeof APPS !== 'undefined') ? APPS.filter(function (x) { return x.id === 'notes'; })[0] : null;
  if (a && !a.__ct) {
    var o = a.render;
    a.render = function () { var r = o.apply(this, arguments); try { notesBanner(); } catch (e) {} return r; };
    a.__ct = 1;
  }
  onStatus(function () { try { notesBanner(); } catch (e) {} });
})();

/* ═════════════════ 2) CATALOG ═════════════════ */
var MAX = 300, DEF = ['AI Prompts', 'Work', 'Disclaimers', 'Messages', 'Personal'];
var PH = /\{\{\s*([^{}]{1,30}?)\s*\}\}/g;
var st = { q: '', cat: '', sort: 'used' }, built = false, ctOff = null;
var scope = 'me', JAM_MAX = 200, JAM_PEOPLE = 20;
var J = { d: null, all: {}, order: [], sel: '', want: '', items: [], ready: false, loaded: false, uD: null, uI: null, iFor: '', panel: null, leaving: {}, pend: {} };

function okItem(i) { return i && typeof i === 'object' && typeof i.id === 'string' && RE_ID.test(i.id); }
function norm(i) {
  return {
    id: i.id, t: str(i.t, 100), b: str(i.b, 10000), c: str(i.c, 40),
    g: Array.isArray(i.g) ? i.g.filter(function (s) { return typeof s === 'string' && s.trim(); }).slice(0, 10).map(function (s) { return s.trim().slice(0, 30); }) : [],
    p: i.p ? 1 : 0, n: +i.n || 0, lu: +i.lu || 0, u: +i.u || 0, cr: +i.cr || 0
  };
}
function items() { return rda(KEYS.c).filter(okItem).map(norm); }
function jamOn() { return !!user && flagOn('cat_jam'); }
function curItems() { return scope === 'jam' && J.d ? J.items.slice() : items(); }
function catsOf(arr) {
  if (!(scope === 'jam' && J.d)) return allCats(arr);
  var seen = {}, out = [];
  (arr || []).forEach(function (i) { if (i.c && !seen[i.c.toLowerCase()]) { seen[i.c.toLowerCase()] = 1; out.push(i.c); } });
  return out.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
}
function saveItems(a) {
  try { LS.setItem(KEYS.c, JSON.stringify(a)); return true; }
  catch (e) { toast('Could not save — device storage is full or blocked.', 'err'); return false; }
}
function savedCats() {
  var seen = {}, out = [];
  rda(SINGLE.g.key).forEach(function (c) { c = str(c, 40).trim(); if (c && !seen[c.toLowerCase()]) { seen[c.toLowerCase()] = 1; out.push(c); } });
  return out;
}
function allCats(arr) {
  var seen = {}, out = [];
  savedCats().concat((arr || items()).map(function (i) { return i.c; })).forEach(function (c) {
    if (c && !seen[c.toLowerCase()]) { seen[c.toLowerCase()] = 1; out.push(c); }
  });
  return out.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
}
function fmtAgo(t) {
  if (!t) return 'Never used';
  var d = Math.floor((Date.now() - t) / 86400000);
  return d <= 0 ? 'Used today' : d === 1 ? 'Used yesterday' : d < 30 ? 'Used ' + d + 'd ago' : 'Used ' + Math.floor(d / 30) + 'mo ago';
}
function copyText(t) {
  function fb() {
    return new Promise(function (res, rej) {
      var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', '');
      a.style.cssText = 'position:fixed;opacity:0;top:0;left:0'; document.body.appendChild(a); a.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(a); ok ? res() : rej();
    });
  }
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).catch(fb);
  return fb();
}
function bump(id) {
  if (scope === 'jam') return;
  var a = items(); a.forEach(function (i) { if (i.id === id) { i.n++; i.lu = Date.now(); } });
  saveItems(a); paintList();
}
function doCopy(it) {
  var names = [], seen = {};
  it.b.replace(PH, function (x, n) { n = n.trim(); if (!seen[n]) { seen[n] = 1; names.push(n); } return x; });
  function fin(text) {
    copyText(text).then(function () { toast('Copied ✓', 'ok'); bump(it.id); }, function () { toast('Could not copy — select the text and copy it manually.', 'err'); });
  }
  if (!names.length) { fin(it.b); return; }
  var node = document.createElement('div');
  node.innerHTML = names.map(function (n, i) {
    return "<label class='ct-lab'>" + esc(n) + "<input class='ks-input' data-i='" + i + "' maxlength='300'></label>";
  }).join('') + "<div class='ct-row'><button type='button' class='btn btn-primary' data-ok>Copy</button></div>";
  var m = window.ksModal('Fill in the blanks', node, { width: 440 });
  node.querySelector('[data-ok]').onclick = function () {
    var vals = {};
    [].forEach.call(node.querySelectorAll('input'), function (inp) { vals[names[+inp.getAttribute('data-i')]] = inp.value; });
    var text = it.b.replace(PH, function (x, n) { var v = vals[n.trim()]; return v ? v : x; });
    m.close(); fin(text);
  };
}

/* ── editor ── */
function openEditor(id) {
  var jm = scope === 'jam' && !!J.d;
  if (jm && !(id ? can('edit') : can('add'))) { toast('Only the host and co-hosts can do that in this Jam.', 'err'); return; }
  var all = curItems(), it = id ? all.filter(function (x) { return x.id === id; })[0] : null;
  if (id && !it) return;
  if (!id && all.length >= (jm ? JAM_MAX : MAX)) { toast((jm ? 'This Jam is full (' + JAM_MAX + ' texts). Delete some first.' : 'Your Catalog is full (' + MAX + ' texts). Delete some first.'), 'err'); return; }
  var cats = catsOf(all), opts = cats.concat(DEF.filter(function (d) { return cats.map(function (c) { return c.toLowerCase(); }).indexOf(d.toLowerCase()) < 0; }));
  var node = document.createElement('div');
  node.innerHTML =
    "<label class='ct-lab'>Title<input class='ks-input' id='ctT' maxlength='100' placeholder='e.g. Data disclaimer' value='" + esc(it ? it.t : '') + "'></label>" +
    "<label class='ct-lab'>Category<input class='ks-input' id='ctC' maxlength='40' list='ctCL' placeholder='Pick or type a new one' value='" + esc(it ? it.c : (st.cat && st.cat[0] !== '@' ? st.cat : '')) + "'></label>" +
    "<datalist id='ctCL'>" + opts.map(function (c) { return "<option value='" + esc(c) + "'>"; }).join('') + "</datalist>" +
    "<label class='ct-lab'>Tags <span class='ct-hint'>comma separated, optional</span><input class='ks-input' id='ctG' maxlength='200' placeholder='client, legal, whatsapp' value='" + esc(it ? it.g.join(', ') : '') + "'></label>" +
    "<label class='ct-lab'>Text <span class='ct-hint' id='ctN'></span><textarea class='ks-input' id='ctB' rows='9' maxlength='10000' placeholder='Paste or write the text you reuse. Tip: use {{name}} for blanks you fill in when copying.'>" + esc(it ? it.b : '') + "</textarea></label>" +
    "<div class='ct-row'><button type='button' class='btn btn-primary' id='ctS'>Save</button>" +
    (it ? "<button type='button' class='btn btn-secondary' id='ctCp'>Copy</button>" + (!jm || can('del') ? "<button type='button' class='btn btn-ghost ct-del' id='ctD'>Delete</button>" : "") : "") + "</div>";
  var m = window.ksModal((it ? 'Edit text' : 'New text') + (jm ? ' · Jam' : ''), node, { width: 540 });
  var T = node.querySelector('#ctT'), B = node.querySelector('#ctB'), N = node.querySelector('#ctN');
  function cnt() { N.textContent = B.value.length + ' / 10000'; }
  B.addEventListener('input', cnt); cnt();
  function collect() {
    var b = B.value.trim(), t = T.value.trim();
    if (!b) { toast('Add the text first.', 'err'); B.focus(); return null; }
    if (!t) t = b.split('\n')[0].slice(0, 60);
    var g = node.querySelector('#ctG').value.split(',').map(function (s) { return s.trim().slice(0, 30); }).filter(Boolean).slice(0, 10);
    var c = node.querySelector('#ctC').value.trim().slice(0, 40);
    var ex = catsOf(curItems()).filter(function (x) { return x.toLowerCase() === c.toLowerCase(); })[0];
    return { t: t.slice(0, 100), b: b, c: ex || c, g: g };
  }
  node.querySelector('#ctS').onclick = function () {
    var v = collect(); if (!v) return;
    if (jm) {
      var sb = node.querySelector('#ctS'); sb.disabled = true;
      jamSave(it ? it.id : null, v).then(function () { m.close(); toast('Saved', 'ok'); }, function (e) { sb.disabled = false; toast(jamErr(e), 'err'); });
      return;
    }
    var a = items(), now = Date.now();
    if (it) a.forEach(function (x) { if (x.id === it.id) { x.t = v.t; x.b = v.b; x.c = v.c; x.g = v.g; x.u = now; } });
    else a.push({ id: uid(), t: v.t, b: v.b, c: v.c, g: v.g, p: 0, n: 0, lu: 0, u: now, cr: now });
    if (saveItems(a)) { m.close(); toast('Saved', 'ok'); paint(); }
  };
  if (it) {
    node.querySelector('#ctCp').onclick = function () { var v = collect(); if (v) doCopy({ id: it.id, b: v.b }); };
    var dBtn = node.querySelector('#ctD');
    if (dBtn) dBtn.onclick = function () {
      if (jm) {
        window.ksAsk('Delete this text for everyone in the Jam?', function () {
          jamDelete(it.id).then(function () { m.close(); }, function (e) { toast(jamErr(e), 'err'); });
        }, { okText: 'Delete', title: 'Delete text' });
        return;
      }
      window.ksAsk('Delete this text? It will be removed from all your devices.', function () {
        saveItems(items().filter(function (x) { return x.id !== it.id; })); m.close(); paint();
      }, { okText: 'Delete', title: 'Delete text' });
    };
  }
}

/* ── categories ── */
function askText(title, label, val, cb) {
  var node = document.createElement('div');
  node.innerHTML = "<label class='ct-lab'>" + esc(label) + "<input class='ks-input' maxlength='40' value='" + esc(val || '') + "'></label><div class='ct-row'><button type='button' class='btn btn-primary'>Save</button></div>";
  var m = window.ksModal(title, node, { width: 400 }), inp = node.querySelector('input');
  function ok() { var v = inp.value.trim(); if (!v) return; m.close(); cb(v); }
  node.querySelector('button').onclick = ok;
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
}
function addCat() {
  askText('New category', 'Category name', '', function (v) {
    v = v.slice(0, 40);
    if (allCats().some(function (c) { return c.toLowerCase() === v.toLowerCase(); })) { toast('That category already exists.', 'err'); return; }
    var a = savedCats(); a.push(v); wr(SINGLE.g.key, a); pushSoon(4000);
    st.cat = v; paint();
  });
}
function manageCats() {
  var cats = allCats();
  if (!cats.length) { toast('No categories yet. Add one with ＋ Category.'); return; }
  var node = document.createElement('div');
  node.innerHTML = cats.map(function (c, i) {
    return "<div class='ct-mrow'><input class='ks-input' data-i='" + i + "' maxlength='40' value='" + esc(c) + "'><button type='button' class='btn btn-secondary' data-r='" + i + "'>Rename</button><button type='button' class='btn btn-ghost ct-del' data-x='" + i + "'>Delete</button></div>";
  }).join('');
  var m = window.ksModal('Manage categories', node, { width: 480 });
  function setCats(fn) {
    var a = fn(savedCats()); wr(SINGLE.g.key, a); pushSoon(4000);
  }
  node.onclick = function (e) {
    var r = e.target.getAttribute && e.target.getAttribute('data-r'), x = e.target.getAttribute && e.target.getAttribute('data-x');
    if (r != null) {
      var old = cats[+r], nv = node.querySelector("input[data-i='" + r + "']").value.trim().slice(0, 40);
      if (!nv || nv === old) return;
      if (cats.some(function (c) { return c.toLowerCase() === nv.toLowerCase() && c !== old; })) { toast('That name is already used.', 'err'); return; }
      var a = items(); a.forEach(function (i) { if (i.c === old) { i.c = nv; i.u = Date.now(); } }); saveItems(a);
      setCats(function (s) { s = s.filter(function (c) { return c !== old; }); s.push(nv); return s; });
      if (st.cat === old) st.cat = nv;
      m.close(); paint();
    } else if (x != null) {
      var del = cats[+x];
      window.ksAsk('Delete the category "' + del + '"? Its texts are kept and become Uncategorised.', function () {
        var a = items(); a.forEach(function (i) { if (i.c === del) { i.c = ''; i.u = Date.now(); } }); saveItems(a);
        setCats(function (s) { return s.filter(function (c) { return c !== del; }); });
        if (st.cat === del) st.cat = '';
        m.close(); paint();
      }, { okText: 'Delete', title: 'Delete category' });
    }
  };
}

/* ── backup ── */
function exportAll() {
  var data = { app: 'alio-catalog', v: 1, exported: new Date().toISOString(), cats: savedCats(), items: items() };
  var blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'alio-catalog-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
}
function importFile(file) {
  if (!file) return;
  if (file.size > 3000000) { toast('That file is too large.', 'err'); return; }
  var fr = new FileReader();
  fr.onload = function () {
    try {
      var d = JSON.parse(fr.result);
      if (!d || d.app !== 'alio-catalog' || !Array.isArray(d.items)) throw 0;
      var a = items(), have = {}, added = 0;
      a.forEach(function (i) { have[i.id] = 1; });
      d.items.forEach(function (raw) {
        if (a.length >= MAX || !raw || typeof raw !== 'object') return;
        var i = norm({ id: 'x', t: raw.t, b: raw.b, c: raw.c, g: raw.g, p: raw.p, n: raw.n, lu: raw.lu, u: raw.u, cr: raw.cr });
        if (!i.b) return;
        i.id = (okItem(raw) && !have[raw.id]) ? raw.id : uid() + added; have[i.id] = 1;
        i.cr = i.cr || Date.now(); i.u = Date.now(); a.push(i); added++;
      });
      if (Array.isArray(d.cats)) {
        var s = savedCats(); d.cats.forEach(function (c) { c = str(c, 40).trim(); if (c && s.map(function (x) { return x.toLowerCase(); }).indexOf(c.toLowerCase()) < 0) s.push(c); });
        wr(SINGLE.g.key, s);
      }
      saveItems(a); toast('Imported ' + added + ' text' + (added === 1 ? '' : 's'), 'ok'); paint();
    } catch (e) { toast('That isn\'t a valid Catalog backup.', 'err'); }
  };
  fr.readAsText(file);
}

/* ── share (system share sheet, text file, or inside Alio chat) ── */
var PENCIL = "<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z'/><path d='m15 5 4 4'/></svg>";
var MSG_PFX = 'alio-ct:', RE_MSG = /alio-ct:([rzs][A-Za-z0-9_-]{4,960})/, MSG_MAX = 1000, SHARE_MAXB = 30000;
function slug(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'catalog-text'; }
function b64u(bytes) { var s2 = '', i; for (i = 0; i < bytes.length; i++) s2 += String.fromCharCode(bytes[i]); return btoa(s2).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(t) { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; var bin = atob(t), a = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
function pipe(bytes, Ctor, mode) {
  var cs = new Ctor(mode), w = cs.writable.getWriter();
  w.write(bytes); w.close();
  return new Response(cs.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
}
/* pack: the smaller of plain / deflate, as URL-safe text (a chat message is capped at 1000 characters) */
function packItem(it) {
  var bytes = new TextEncoder().encode(JSON.stringify({ v: 1, t: it.t, b: it.b, c: it.c, g: it.g })), raw = 'r' + b64u(bytes);
  if (typeof CompressionStream !== 'function') return Promise.resolve(raw);
  return pipe(bytes, CompressionStream, 'deflate-raw').then(function (z) { var c = 'z' + b64u(z); return c.length < raw.length ? c : raw; }, function () { return raw; });
}
function fromData(d) {   /* same shape as Export backup ({items:[…]}) or a bare item */
  if (d && Array.isArray(d.items)) d = d.items[0];
  var i = norm({ id: 'x', t: d && d.t, b: d && d.b, c: d && d.c, g: d && d.g });
  return i.b ? i : null;
}
function newShareId() {
  var a = new Uint8Array(16), s2 = '', i;
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (i = 0; i < 16; i++) a[i] = Math.random() * 256;
  for (i = 0; i < 16; i++) s2 += (a[i] % 36).toString(36);
  return s2;
}
/* the full text is stored as a small backup-style file in the cloud; the chat message only carries its id */
function putShare(it) {
  if (!user || !fs.getDoc) return Promise.reject({ code: 'no-user' });
  var id = newShareId(), b = fs.writeBatch(db);
  b.set(fs.doc(db, 'sharedCatalog', id), { from: user.uid, d: JSON.stringify({ app: 'alio-catalog', v: 1, items: [{ t: it.t, b: it.b, c: it.c, g: it.g }] }), at: fs.serverTimestamp() });
  return b.commit().then(function () { return 's' + id; });
}
function getShare(id) {
  if (!/^[a-z0-9]{12,40}$/.test(id) || !fs.getDoc) return Promise.reject();
  return fs.getDoc(fs.doc(db, 'sharedCatalog', id)).then(function (snap) {
    if (!snap.exists()) throw 0;
    var d = JSON.parse(String(snap.data().d || '')), i = fromData(d);
    if (!i) throw 0; return i;
  });
}
function unpackItem(tok) {
  if (tok.charAt(0) === 's') return getShare(tok.slice(1));
  return new Promise(function (res, rej) {
    try {
      var kind = tok.charAt(0), bytes = unb64u(tok.slice(1));
      var go2 = function (u8) {
        if (u8.length > SHARE_MAXB) return rej();
        var i = fromData(JSON.parse(new TextDecoder().decode(u8)));
        if (!i) return rej();
        res(i);
      };
      if (kind === 'z') { if (typeof DecompressionStream !== 'function') return rej(); pipe(bytes, DecompressionStream, 'deflate-raw').then(go2, rej); }
      else go2(bytes);
    } catch (e) { rej(e); }
  });
}
function msgInfo(text) {
  var m = RE_MSG.exec(String(text || '')); if (!m) return null;
  var h = /Catalog text: [\u201c"](.*)[\u201d"]/.exec(String(text).split('\n')[0] || '');
  return { tok: m[1], title: h ? h[1].slice(0, 60) : 'Catalog text' };
}
window.ksCatPrev = function (text) { var jm0 = jamMsg(text); if (jm0) return '\uD83E\uDED9 Jam invite: ' + jm0.name; var m = msgInfo(text); return m ? '\uD83D\uDCDA Catalog text: ' + m.title : ''; };
window.ksCatCard = function (text) {
  var jm0 = jamMsg(text);
  if (jm0) return "<div class='ks-chessinv'><div class='ks-chessinv-t'>\uD83E\uDED9 Jam invite</div>" +
    "<div style='margin:4px 0 4px;font-weight:600;word-break:break-word'>" + esc(jm0.name) + "</div>" +
    "<div style='margin:0 0 8px;font-size:12.5px;opacity:.75'>A shared Catalog. Everyone in it can view and copy the texts. You can be in as many Jams as you like.</div>" +
    "<button class='btn btn-primary' data-jid='" + jm0.jid + "' data-code='" + jm0.code + "' data-name='" + esc(jm0.name) + "' onclick=\"event.stopPropagation();ksCatAct('joinjam',this)\">Join Jam</button></div>";
  var m = msgInfo(text); if (!m) return '';
  return "<div class='ks-chessinv'><div class='ks-chessinv-t'>\uD83D\uDCDA Catalog text</div>" +
    "<div style='margin:4px 0 8px;font-weight:600;word-break:break-word'>" + esc(m.title) + "</div>" +
    "<div style='display:flex;gap:8px;flex-wrap:wrap'>" +
    "<button class='btn btn-primary' data-ct='" + m.tok + "' onclick=\"event.stopPropagation();ksCatAct('add',this)\">Add to my Catalog</button>" +
    "<button class='btn btn-ghost' data-ct='" + m.tok + "' onclick=\"event.stopPropagation();ksCatAct('view',this)\">Read</button></div></div>";
};
function addShared(i) {
  if (!user) { toast('Sign in to add this to your Catalog.', 'err'); return; }
  if (!editOn()) return offMsg();
  var a = items();
  if (a.length >= MAX) { toast('Your Catalog is full (' + MAX + ' texts). Delete some first.', 'err'); return; }
  function doAdd() {
    var now = Date.now(), n = items();
    n.push({ id: uid(), t: i.t, b: i.b, c: i.c, g: i.g, p: 0, n: 0, lu: 0, u: now, cr: now });
    if (!saveItems(n)) return;
    try { window.ksToast('Added to your Catalog', { type: 'ok', actionText: 'Open', onAction: function () { go('catalog'); } }); } catch (e) { toast('Added to your Catalog', 'ok'); }
    ctRefresh();
  }
  if (a.some(function (x) { return x.t === i.t && x.b === i.b; })) {
    window.ksAsk('You already have this exact text in your Catalog. Add another copy?', doAdd, { okText: 'Add copy', title: 'Already saved', danger: false });
  } else doAdd();
}
function readShared(i) {
  injectCss();
  var node = document.createElement('div');
  node.innerHTML = "<div class='ct-meta' style='margin:0 0 10px'>" + (i.c ? "<span class='ct-tag ct-cat'>" + esc(i.c) + "</span>" : '') + i.g.map(function (g) { return "<span class='ct-tag'>#" + esc(g) + "</span>"; }).join('') + "</div>" +
    "<div class='ct-read'>" + esc(i.b) + "</div>" +
    "<div class='ct-row' style='margin-top:12px'><button type='button' class='btn btn-primary' data-k='add'>Add to my Catalog</button><button type='button' class='btn btn-secondary' data-k='copy'>Copy</button></div>";
  var m = window.ksModal(i.t, node, { width: 520 });
  node.querySelector('[data-k=add]').onclick = function () { m.close(); addShared(i); };
  node.querySelector('[data-k=copy]').onclick = function () { copyText(i.b).then(function () { toast('Copied ✓', 'ok'); }, function () { toast('Could not copy.', 'err'); }); };
}
window.ksCatAct = function (kind, btn) {
  if (kind === 'joinjam') { confirmJoin(btn.getAttribute('data-jid'), btn.getAttribute('data-code'), btn.getAttribute('data-name') || 'Jam'); return; }
  var tok = btn && btn.getAttribute('data-ct'); if (!tok) return;
  unpackItem(tok).then(function (i) { if (kind === 'add') addShared(i); else readShared(i); }, function () { toast('This shared text could not be opened.', 'err'); });
};
function shareText(it) {
  if (navigator.share) {
    navigator.share({ title: it.t, text: it.b }).catch(function (e) { if (e && e.name === 'AbortError') return; copyText(it.b).then(function () { toast('Could not open sharing, so the text was copied.', 'ok'); }, function () {}); });
  } else copyText(it.b).then(function () { toast('Sharing is not available here, so the text was copied.', 'ok'); }, function () { toast('Could not share.', 'err'); });
}
function shareFile(it) {
  var name = slug(it.t) + '.txt', blob = new Blob([it.b], { type: 'text/plain' });
  function dl() {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); toast('Saved ' + name, 'ok');
  }
  try {
    var f = new File([blob], name, { type: 'text/plain' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: it.t }).catch(function (e) { if (!e || e.name !== 'AbortError') dl(); }); return; }
  } catch (e) {}
  dl();
}
function chatRows(me) {
  var out = [];
  try { (dmChats || []).forEach(function (c) { if (c.status !== 'accepted' || c.blockedBy) return; var u = (c.members || []).filter(function (x) { return x !== me; })[0]; if (u) out.push({ t: 'dm', id: u, name: dmPerson(u).name || 'Chat' }); }); } catch (e) {}
  try { (gcGroups || []).forEach(function (g) { out.push({ t: 'gc', id: g.id, name: '\uD83D\uDC65 ' + (g.name || 'Group') }); }); } catch (e) {}
  return out;
}
function chatPicker(prepare) {
  var K = window.KSFirebase, me = null;
  try { me = dmMe(); } catch (e) {}
  if (!K || !K.dmSend || !me) { toast('Sign in and wait a moment for chat to connect.', 'err'); return; }
  try { startDmListener(); } catch (e) {}
  try { dmWatch((dmChats || []).map(dmOther).filter(Boolean)); } catch (e) {}
  var old = document.getElementById('ctShareOv'); if (old) old.remove();
  var ov = document.createElement('div'); ov.id = 'ctShareOv'; ov.className = 'ks-dm-overlay';
  ov.innerHTML = "<div class='ks-dm-box ks-gc-box' onclick='event.stopPropagation()'><div class='gc-modal-head'><div class='gc-modal-title'>Send in Alio chat</div><button type='button' class='ks-kebab' aria-label='Close' data-x>✕</button></div>" +
    "<input class='ks-input' id='ctShQ' placeholder='Search chats' autocomplete='off' style='width:100%;box-sizing:border-box;margin:0 0 8px'><div id='ctShL' style='max-height:50vh;overflow:auto'></div></div>";
  document.body.appendChild(ov);
  function close() { ov.remove(); }
  ov.addEventListener('click', close); ov.querySelector('[data-x]').onclick = close;
  var list = ov.querySelector('#ctShL'), q = ov.querySelector('#ctShQ'), sent = {}, pre = null;
  function msg() { return pre || (pre = prepare().catch(function (e) { pre = null; throw e; })); }
  function fill() {
    var w = q.value.trim().toLowerCase(), rows = chatRows(me).filter(function (r) { return !w || r.name.toLowerCase().indexOf(w) > -1; });
    list.innerHTML = '';
    if (!rows.length) { list.innerHTML = "<p class='admin-empty'>" + (w ? 'No chats match.' : 'No chats yet. Start a chat from Messages first.') + "</p>"; return; }
    rows.forEach(function (r) {
      var key = r.t + r.id, b = document.createElement('button'); b.type = 'button'; b.className = 'ks-chat-row';
      b.style.cssText = 'width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);color:inherit;font:inherit';
      b.textContent = r.name + (sent[key] ? '  ✓ Sent' : ''); b.disabled = !!sent[key]; list.appendChild(b);
      b.onclick = function () {
        if (b.disabled) return; b.disabled = true;
        msg().then(function (text) { return r.t === 'dm' ? K.dmSend(r.id, text) : K.gcSend(r.id, text); })
          .then(function () { sent[key] = 1; b.textContent = r.name + '  ✓ Sent'; toast('Sent', 'ok'); },
            function (e) { b.disabled = false; toast(e && e.ctMsg ? e.ctMsg : 'Could not send. Please try again.', 'err'); });
      };
    });
  }
  q.addEventListener('input', fill); fill(); setTimeout(function () { if (document.getElementById('ctShL')) fill(); }, 1500);
}
function prepareMsg(it) {
  var title = it.t.replace(/[\r\n]+/g, ' ').replace(/[\u201c\u201d]/g, '"').slice(0, 40) + (it.t.length > 40 ? '…' : '');
  var head = '\uD83D\uDCDA Catalog text: \u201c' + title + '\u201d\n' + MSG_PFX;
  return putShare(it).then(function (tok) { return head + tok; }, function (err) {
    return packItem(it).then(function (tok) {   /* fallback: tiny texts can still travel inside the message itself */
      if ((head + tok).length <= MSG_MAX) return head + tok;
      var e = new Error('share'); e.ctMsg = (err && err.code === 'permission-denied')
        ? 'Chat sharing of longer texts is not switched on on the server yet. Use a text file for now.'
        : 'Could not prepare this text for chat. Check your connection and try again.';
      throw e;
    });
  });
}
function shareChat(it) { chatPicker(function () { return prepareMsg(it); }); }
function openShare(it) {
  injectCss();
  var node = document.createElement('div');
  node.innerHTML =
    "<button type='button' class='ct-sh ct-sh-main' data-k='chat'><span class='ct-sh-i'>💬</span><span><b>Alio chat</b><small>Send to a chat or group. They can add it to their own Catalog.</small></span></button>" +
    "<button type='button' class='ct-sh' data-k='text'><span class='ct-sh-i'>📝</span><span><b>Share as text</b><small>WhatsApp, Messages, email and other apps.</small></span></button>" +
    "<button type='button' class='ct-sh' data-k='file'><span class='ct-sh-i'>📄</span><span><b>Share as text file</b><small>A .txt file you can send or save.</small></span></button>" +
    "";
  var m = window.ksModal('Share', node, { width: 420 });
  node.onclick = function (e) {
    var b = e.target.closest ? e.target.closest('[data-k]') : null; if (!b) return;
    var k = b.getAttribute('data-k'); m.close();
    if (k === 'chat') shareChat(it); else if (k === 'text') shareText(it); else shareFile(it);
  };
}

/* ═════════════════ JAMS — any number of shared Catalogs (up to 20 people each) ═════════════════
   catalogJams/{jid}   {name, ownerUid, hosts[], members[], perms{add,edit,del,invite,share}, code, createdAt, updatedAt}
                       Roles: Host = ownerUid · Co-host = in hosts[] but not the owner · Member = everyone else in members[]
   catalogJams/{jid}/items/{id}   {t,b,c,g, by, ed, cr, at}
   catalogJamJoins/{jid~uid}      {jid, uid, code, at}   (proof of the invite code, used once to join)
   You can be in as many Jams as you like. Every Jam is its own document with its own members, roles and permissions,
   so nothing is shared between Jams. Only the Jam you are looking at has its texts streamed in (the others only
   keep their small settings document live). Roles, permissions, direct-add privacy and the 20-person cap are all
   enforced by the Firestore rules; the UI only hides what the server would refuse anyway.
   Everyone in a Jam can always view, search and copy. "Share out" only hides a button. */
var JAM_LBL = { add: 'Add texts', edit: 'Edit texts', del: 'Delete texts', share: 'Share texts out', invite: 'Add & invite people' };
var JAM_WHO = { add: 'Create new texts in this Jam.', edit: 'Change the title, category, tags or text of an existing text.', del: 'Remove a text from the Jam for everyone.', share: 'Show the Share button on texts (anyone who can read a text can still copy it).', invite: 'Add people directly, and hand out the invite link and code.' };
var JAM_DEF = { add: 'all', edit: 'all', del: 'hosts', share: 'all', invite: 'hosts' };
var RE_JAM = /alio-jam:([A-Za-z0-9]{12,40})\.([A-Za-z0-9]{24,40})/;
var RE_JLINK = /[?&]jjoin=([A-Za-z0-9]{12,40})\.([A-Za-z0-9]{24,40})/;
function jamMsg(text) {
  var m = RE_JAM.exec(String(text || '')); if (!m) return null;
  var h = /Jam invite: [\u201c"](.*)[\u201d"]/.exec(String(text).split('\n')[0] || '');
  return { jid: m[1], code: m[2], name: h ? h[1].slice(0, 60) : 'Jam' };
}
function jamParse(t) {   /* an invite link, an "alio-jam:" code, or a bare "id.code" */
  t = String(t || '').trim();
  var m = RE_JLINK.exec(t) || RE_JAM.exec(t) || /^([A-Za-z0-9]{12,40})\.([A-Za-z0-9]{24,40})$/.exec(t);
  return m ? { jid: m[1], code: m[2] } : null;
}
function jamErr(e) {
  var c = e && e.code;
  if (c === 'permission-denied') return 'Not allowed. The host may have changed the permissions, or the admin switched Jams off.';
  if (c === 'unavailable' || !navigator.onLine) return 'You are offline. Try again when you are back online.';
  return 'Something went wrong. Please try again.';
}
function ms(t) { try { return t && t.toMillis ? t.toMillis() : Date.now(); } catch (e) { return Date.now(); } }
function newJ() { return { d: null, all: {}, order: [], sel: '', want: '', items: [], ready: false, loaded: false, uD: null, uI: null, iFor: '', panel: null, leaving: {}, pend: {} }; }

/* ── roles ── */
function roleOf(d, u) { return !d || !u ? '' : d.ownerUid === u ? 'owner' : d.hosts.indexOf(u) > -1 ? 'host' : d.members.indexOf(u) > -1 ? 'member' : ''; }
function roleLbl(r) { return r === 'owner' ? 'Host' : r === 'host' ? 'Co-host' : 'Member'; }
function myRoleIn(d) { return user ? roleOf(d, user.uid) : ''; }
function myRole() { return myRoleIn(J.d); }
function isHostIn(d) { var r = myRoleIn(d); return r === 'owner' || r === 'host'; }
function isHost() { return isHostIn(J.d); }
function canIn(d, k) { return !!d && (isHostIn(d) || (!!d.perms && d.perms[k] === 'all')); }
function can(k) { return canIn(J.d, k); }
function canInvite() { return canIn(J.d, 'invite'); }
/* Host manages everyone; a Co-host manages everyone except the Host; a Member manages nobody. Nobody manages themselves here. */
function canManage(d, target) {
  if (!user || target === user.uid) return false;
  var me = roleOf(d, user.uid), tr = roleOf(d, target);
  return !!tr && tr !== 'owner' && (me === 'owner' || me === 'host');
}
function pname(u) {
  if (user && u === user.uid) return 'You';
  try { var p = dmPerson(u); if (p && p.name) return p.name; } catch (e) {}
  return 'Member';
}
function realName(u) { try { var p = dmPerson(u); if (p && p.name) return p.name; } catch (e) {} return 'Member'; }
function when(t) {
  var d = Math.floor((Date.now() - t) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? d + 'd ago' : Math.floor(d / 30) + 'mo ago';
}
function cleanJam(id, d) {
  var perms = {}, p = (d && d.perms) || {};
  Object.keys(JAM_DEF).forEach(function (k) { perms[k] = p[k] === 'all' ? 'all' : (p[k] === 'hosts' ? 'hosts' : JAM_DEF[k]); });
  return { id: id, name: str(d.name, 40) || 'Jam', ownerUid: str(d.ownerUid, 128), hosts: Array.isArray(d.hosts) ? d.hosts : [], members: Array.isArray(d.members) ? d.members : [], perms: perms, code: str(d.code, 40), cr: ms(d.createdAt) };
}

/* ── live data ── */
function jamStop() {
  if (J.uD) { try { J.uD(); } catch (e) {} } if (J.uI) { try { J.uI(); } catch (e) {} }
  J = newJ(); scope = 'me';
}
function jamStart() {
  jamStop();
  if (!user || !flagOn('cat_jam')) return;
  J.uD = fs.onSnapshot(fs.query(fs.collection(db, 'catalogJams'), fs.where('members', 'array-contains', user.uid)), function (snap) {
    var all = {}; snap.forEach(function (x) { all[x.id] = cleanJam(x.id, x.data()); });
    setJams(all);
  }, function () { J.loaded = true; jamRepaint(); /* offline or rules off: Jams simply are not shown */ });
}
function dropSel() {
  if (J.uI) { try { J.uI(); } catch (e) {} J.uI = null; }
  J.sel = ''; J.d = null; J.items = []; J.ready = false; J.iFor = ''; scope = 'me';
}
function ensureItems(id) {
  if (J.iFor === id && J.uI) return;
  if (J.uI) { try { J.uI(); } catch (e) {} J.uI = null; }
  J.items = []; J.ready = false; J.iFor = id;
  J.uI = fs.onSnapshot(fs.collection(db, 'catalogJams', id, 'items'), function (snap) {
    if (J.iFor !== id) return;
    var a = [];
    snap.forEach(function (x) { var v = x.data(); if (!okItem({ id: x.id })) return; var i = norm({ id: x.id, t: v.t, b: v.b, c: v.c, g: v.g }); i.by = str(v.by, 128); i.ed = str(v.ed, 128); i.cr = ms(v.cr); i.u = ms(v.at); a.push(i); });
    J.items = a; J.ready = true;
    if (document.getElementById('ctList') && scope === 'jam') { paintChips(); paintList(); paintStatus(); }
  }, function () { if (J.iFor !== id) return; J.ready = true; if (document.getElementById('ctList') && scope === 'jam') paintList(); });
}
function setJams(all) {
  var prev = J.all, first = !J.loaded;
  J.all = all; J.loaded = true;
  J.order = Object.keys(all).sort(function (a, b) { return (all[a].cr - all[b].cr) || (all[a].name.toLowerCase() < all[b].name.toLowerCase() ? -1 : 1); });
  Object.keys(all).forEach(function (id) {
    if (!first && !prev[id] && !J.pend[id]) toast('You were added to the Jam “' + all[id].name + '”.', 'ok');
    delete J.pend[id];
  });
  Object.keys(prev).forEach(function (id) {
    if (!all[id]) { if (!J.leaving[id]) toast('You are no longer in the Jam “' + prev[id].name + '”.', 'err'); delete J.leaving[id]; }
  });
  if (J.sel) {
    if (all[J.sel]) { J.d = all[J.sel]; try { dmWatch(J.d.members); } catch (e) {} }
    else dropSel();
  }
  if (J.want && all[J.want]) { var w = J.want; J.want = ''; selectJam(w, true); return; }
  jamRepaint();
  setTimeout(function () { if (J.d && J.panel) fillPanel(); if (document.getElementById('ctList') && scope === 'jam') paintList(); }, 1500);   /* names may arrive late */
  jlinkCheck();
}
function jamRepaint() {
  if (J.panel) { if (!J.d || !document.body.contains(J.panel.node) || J.panel.jid !== J.d.id) { try { J.panel.m.close(); } catch (e) {} J.panel = null; } else fillPanel(); }
  if (document.getElementById('ctBody')) { if (built) paintAll(); else paint(); }
}
/* open a Jam ('' = back to My Catalog) */
function selectJam(id, keepQuery) {
  closeMenu();
  if (id && !J.all[id]) id = '';
  if (J.panel) { try { J.panel.m.close(); } catch (e) {} J.panel = null; }
  if (!id) { dropSel(); }
  else { J.sel = id; J.d = J.all[id]; scope = 'jam'; ensureItems(id); try { dmWatch(J.d.members); } catch (e) {} }
  st.cat = ''; if (!keepQuery) st.q = '';
  if (document.getElementById('ctBody')) { built = false; paint(); }
}

/* ── writes ── */
function jamSave(id, v) {
  if (!J.d || !user) return Promise.reject({});
  var b = fs.writeBatch(db), ref = fs.doc(db, 'catalogJams', J.d.id, 'items', id || uid());
  if (id) b.update(ref, { t: v.t, b: v.b, c: v.c, g: v.g, ed: user.uid, at: fs.serverTimestamp() });
  else b.set(ref, { t: v.t, b: v.b, c: v.c, g: v.g, by: user.uid, ed: user.uid, cr: fs.serverTimestamp(), at: fs.serverTimestamp() });
  return b.commit();
}
function jamAddTo(jid, v, salt) {   /* add one text to any Jam you are in (not only the open one) */
  var b = fs.writeBatch(db), ref = fs.doc(db, 'catalogJams', jid, 'items', uid() + (salt || ''));
  b.set(ref, { t: v.t, b: v.b, c: v.c, g: v.g, by: user.uid, ed: user.uid, cr: fs.serverTimestamp(), at: fs.serverTimestamp() });
  return b.commit();
}
function jamDelete(id) {
  if (!J.d) return Promise.reject({});
  var b = fs.writeBatch(db); b.delete(fs.doc(db, 'catalogJams', J.d.id, 'items', id)); return b.commit();
}
function jamPatch(patch) {
  if (!J.d) return Promise.reject({});
  patch.updatedAt = fs.serverTimestamp();
  var b = fs.writeBatch(db); b.update(fs.doc(db, 'catalogJams', J.d.id), patch); return b.commit();
}
/* the texts of a Jam that is not open (one read, then it stops listening) — used to check size and duplicates */
function jamPeek(jid) {
  if (J.iFor === jid && J.ready) return Promise.resolve(J.items);
  return new Promise(function (res, rej) {
    var off = null, done = false, last = null, tm = null;
    function fin(a) { if (done) return; done = true; clearTimeout(tm); setTimeout(function () { try { if (off) off(); } catch (e) {} }, 0); res(a); }
    off = fs.onSnapshot(fs.collection(db, 'catalogJams', jid, 'items'), function (snap) {
      var a = []; snap.forEach(function (x) { var v = x.data(); a.push({ id: x.id, t: str(v.t, 100), b: str(v.b, 10000) }); });
      if (snap.metadata.fromCache && navigator.onLine) { last = a; if (!tm) tm = setTimeout(function () { fin(last); }, 5000); return; }
      fin(a);
    }, function (e) { if (done) return; done = true; clearTimeout(tm); rej(e); });
  });
}
function newId(n) { var s2 = ''; while (s2.length < n) s2 += newShareId(); return s2.slice(0, n); }
function createJam(name) {
  if (!user || !jamOn()) return Promise.reject({});
  name = (name || '').trim().slice(0, 40); if (!name) { toast('Give the Jam a name.', 'err'); return Promise.reject({}); }
  var id = newId(16), b = fs.writeBatch(db), t = fs.serverTimestamp();
  b.set(fs.doc(db, 'catalogJams', id), { name: name, ownerUid: user.uid, hosts: [user.uid], members: [user.uid], perms: JAM_DEF, code: newId(32), createdAt: t, updatedAt: t });
  J.pend[id] = 1; J.want = id;
  return b.commit().then(function () { toast('Jam created. Add people from its ⚙ settings.', 'ok'); }, function (e) { delete J.pend[id]; J.want = ''; toast(jamErr(e), 'err'); throw e; });
}
function confirmJoin(jid, code, name) {
  if (!user) { toast('Sign in to join a Jam.', 'err'); return; }
  if (!jamOn()) return offMsg();
  if (J.all[jid]) { toast('You are already in “' + J.all[jid].name + '”.', 'ok'); go('catalog'); setTimeout(function () { selectJam(jid); }, 60); return; }
  window.ksAsk('Everyone in this Jam will be able to see its texts, and you will see theirs. Join \"' + String(name).replace(/[\"<>&]/g, '') + '\"?', function () { joinJam(jid, code); }, { title: 'Join this Jam?', okText: 'Join', danger: false });
}
function joinJam(jid, code) {
  var b = fs.writeBatch(db);
  b.set(fs.doc(db, 'catalogJamJoins', jid + '~' + user.uid), { jid: jid, uid: user.uid, code: code, at: fs.serverTimestamp() });
  b.update(fs.doc(db, 'catalogJams', jid), { members: fs.arrayUnion(user.uid) });
  J.pend[jid] = 1; J.want = jid;
  return b.commit().then(function () {
    try { window.ksToast('You joined the Jam', { type: 'ok', actionText: 'Open', onAction: function () { go('catalog'); } }); } catch (e) { toast('You joined the Jam', 'ok'); }
  }, function (e) { delete J.pend[jid]; J.want = ''; toast(e && e.code === 'permission-denied' ? 'This invite is no longer valid, or the Jam is full (' + JAM_PEOPLE + ' people).' : jamErr(e), 'err'); });
}
function leaveJam() {
  if (!J.d) return;
  var d = J.d, b = fs.writeBatch(db);
  J.leaving[d.id] = 1;
  b.update(fs.doc(db, 'catalogJams', d.id), { members: d.members.filter(function (x) { return x !== user.uid; }), hosts: d.hosts.filter(function (x) { return x !== user.uid; }), updatedAt: fs.serverTimestamp() });
  b.delete(fs.doc(db, 'catalogJamJoins', d.id + '~' + user.uid));
  b.commit().then(function () { toast('You left “' + d.name + '”', 'ok'); }, function (e) { delete J.leaving[d.id]; toast(jamErr(e), 'err'); });
}
function removePerson(u) {
  var d = J.d; if (!d || !canManage(d, u)) return;
  jamPatch({ members: d.members.filter(function (x) { return x !== u; }), hosts: d.hosts.filter(function (x) { return x !== u; }) }).then(function () { toast('Removed from the Jam', 'ok'); }, function (e) { toast(jamErr(e), 'err'); });
}
function setCohost(u, on) {
  var d = J.d; if (!d || !canManage(d, u)) return;
  var h = d.hosts.filter(function (x) { return x !== u; }); if (on) h.push(u);
  if (h.length > 10) { toast('A Jam can have up to 10 hosts and co-hosts.', 'err'); return; }
  jamPatch({ hosts: h }).then(function () { toast(on ? 'Made co-host' : 'Removed as co-host', 'ok'); }, function (e) { toast(jamErr(e), 'err'); });
}
function makeOwner(u) {
  var d = J.d; if (!d || myRole() !== 'owner' || u === d.ownerUid) return;
  window.ksAsk('Make ' + realName(u) + ' the Host of “' + d.name + '”? You stay a co-host.', function () {
    var h = d.hosts.filter(function (x) { return x !== u; }); h.push(u);
    jamPatch({ ownerUid: u, hosts: h }).then(function () { toast('Host changed', 'ok'); }, function (e) { toast(jamErr(e), 'err'); });
  }, { title: 'Make Host', okText: 'Make Host', danger: false });
}
/* Delete Jam: owner only, and only after typing the Jam's name */
function deleteJam() {
  var d = J.d; if (!d || myRole() !== 'owner') return;
  var node = document.createElement('div');
  node.innerHTML = "<p class='ct-hint' style='margin:0 0 12px;line-height:1.55;font-size:13px'>This permanently deletes <b>" + esc(d.name) + "</b>, its " + J.items.length + " text" + (J.items.length === 1 ? '' : 's') + " and its " + d.members.length + " member" + (d.members.length === 1 ? '' : 's') + "' access, for everyone. People keep any texts they already saved to their own Catalog. This cannot be undone.</p>" +
    "<label class='ct-lab'>Type the Jam name to confirm<input class='ks-input' id='jdN' autocomplete='off' placeholder='" + esc(d.name) + "'></label>" +
    "<div class='ct-row'><button type='button' class='btn ct-danger-solid' id='jdGo' disabled>Delete Jam</button><button type='button' class='btn btn-ghost' id='jdNo'>Cancel</button></div>";
  var m = window.ksModal('Delete this Jam?', node, { width: 440 }), inp = node.querySelector('#jdN'), go2 = node.querySelector('#jdGo');
  inp.addEventListener('input', function () { go2.disabled = inp.value.trim() !== d.name; });
  node.querySelector('#jdNo').onclick = function () { m.close(); };
  go2.onclick = function () {
    if (inp.value.trim() !== d.name) return;
    go2.disabled = true; J.leaving[d.id] = 1;
    var ids = J.items.map(function (x) { return x.id; }), chain = Promise.resolve();
    for (var i = 0; i < ids.length; i += 400) (function (part) {
      chain = chain.then(function () { var b = fs.writeBatch(db); part.forEach(function (id) { b.delete(fs.doc(db, 'catalogJams', d.id, 'items', id)); }); return b.commit(); });
    })(ids.slice(i, i + 400));
    chain.then(function () { var b = fs.writeBatch(db); b.delete(fs.doc(db, 'catalogJams', d.id)); return b.commit(); })
      .then(function () { m.close(); if (J.panel) { try { J.panel.m.close(); } catch (e) {} J.panel = null; } toast('Jam deleted', 'ok'); }, function (e) { delete J.leaving[d.id]; go2.disabled = false; toast(jamErr(e), 'err'); });
  };
}

/* ── invites ── */
function inviteCode(d) { return 'alio-jam:' + d.id + '.' + d.code; }
function inviteLink(d) { return location.origin + location.pathname + '?jjoin=' + d.id + '.' + d.code; }
function inviteText(d) { return '\uD83E\uDED9 Jam invite: \u201c' + d.name.replace(/[\r\n]+/g, ' ').replace(/[\u201c\u201d]/g, '"') + '\u201d\n' + inviteCode(d); }
function jlinkCheck() {   /* a ?jjoin= link opened while signed out is remembered, then offered once Jams have loaded */
  if (!user || !J.loaded) return;
  var o = null; try { o = JSON.parse(LS.getItem('ks_jjoin') || 'null'); } catch (e) {}
  if (!o) return;
  try { LS.removeItem('ks_jjoin'); } catch (e2) {}
  if (!o.jid || !o.code || Date.now() - (o.t || 0) > 864e5) return;
  confirmJoin(o.jid, o.code, 'this Jam');
}
(function jlinkRead() {
  try {
    var sp = new URLSearchParams(location.search), v = sp.get('jjoin'); if (!v) return;
    var p = jamParse('?jjoin=' + v);
    if (p) LS.setItem('ks_jjoin', JSON.stringify({ jid: p.jid, code: p.code, t: Date.now() }));
    sp.delete('jjoin'); var q = sp.toString();
    try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) {}
  } catch (e) {}
})();

/* Direct add — the server refuses it when the person has switched off "Let people add me to groups or Jams" */
function addPerson(r, btn) {
  var d = J.d; if (!d || !user) return;
  if (!canIn(d, 'invite')) { toast('Only the host and co-hosts can add people to this Jam.', 'err'); return; }
  if (d.members.indexOf(r.uid) > -1) { toast(r.name + ' is already in this Jam.', 'ok'); return; }
  if (d.members.length >= JAM_PEOPLE) { toast('This Jam is full (' + JAM_PEOPLE + ' people).', 'err'); return; }
  if (btn) btn.disabled = true;
  function blocked() { if (btn) btn.disabled = false; blockedPrompt(d, r); }
  fs.getDoc(fs.doc(db, 'publicProfiles', r.uid)).then(function (snap) {
    if (!snap.exists()) { if (btn) btn.disabled = false; toast('That account could not be found.', 'err'); return; }
    if (snap.data().allowGroupAdd === false) return blocked();
    var b = fs.writeBatch(db);
    b.update(fs.doc(db, 'catalogJams', d.id), { members: fs.arrayUnion(r.uid), updatedAt: fs.serverTimestamp() });
    return b.commit().then(function () { toast('Added ' + r.name + ' to “' + d.name + '”', 'ok'); if (J.panel) { J.panel.res = null; var q = J.panel.node.querySelector('#jpQ'); if (q) q.value = ''; fillPanel(); } });
  }).catch(function (e) {
    if (e && e.code === 'permission-denied') { toast('They could not be added directly. They may have just turned that off. You can invite them instead.', 'err'); blocked(); }
    else { if (btn) btn.disabled = false; toast(jamErr(e), 'err'); }
  });
}
function blockedPrompt(d, r) {
  var opts = { uid: r.uid, name: r.name, what: 'Jam', title: d.name, dmText: inviteText(d), link: inviteLink(d), code: inviteCode(d) };
  if (typeof window.ksBlockedAddPrompt === 'function') { window.ksBlockedAddPrompt(opts); return; }
  window.ksAsk(r.name + ' has turned off direct adds to groups and Jams. Copy the invite code and send it to them yourself.', function () { copyText(opts.code).then(function () { toast('Invite code copied', 'ok'); }, function () {}); }, { title: 'Can\'t add directly', okText: 'Copy code', danger: false });
}
function findPerson() {
  var P = J.panel; if (!P) return;
  var inp = P.node.querySelector('#jpQ'); if (!inp) return;
  var name = inp.value.trim().toLowerCase().replace(/^@/, '');
  var K = window.KSFirebase;
  if (!/^[a-z0-9_]{3,20}$/.test(name)) { P.res = { msg: 'Enter a full username (3–20 letters, numbers or underscores).' }; fillPanel(); return; }
  if (!K || !K.lookupUsername) { P.res = { msg: 'Still connecting. Try again in a moment.' }; fillPanel(); return; }
  P.res = { msg: 'Searching…' }; fillPanel();
  K.lookupUsername(name).then(function (r) {
    if (!J.panel) return;
    if (!r || !r.uid) J.panel.res = { msg: 'No user found with that username.' };
    else if (r.uid === user.uid) J.panel.res = { msg: 'That is you.' };
    else { J.panel.res = { uid: r.uid, username: name, name: (r.profile && r.profile.displayName) || 'Alio user' }; try { dmWatch([r.uid]); } catch (e) {} }
    fillPanel();
  }, function () { if (J.panel) { J.panel.res = { msg: 'Search failed. Please try again.' }; fillPanel(); } });
}

/* ── small pop-up menu (three dots, +) : a floating card on desktop, a bottom sheet on phones ── */
var menuEl = null, menuBg = null;
function closeMenu() {
  if (menuEl) { menuEl.remove(); menuEl = null; }
  if (menuBg) { menuBg.remove(); menuBg = null; }
  document.removeEventListener('keydown', menuKey, true);
  window.removeEventListener('resize', closeMenu);
}
function menuKey(e) { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } }
function openMenu(btn, entries, title) {
  closeMenu();
  injectCss();
  var el = document.createElement('div'); el.className = 'ct-menu'; el.setAttribute('role', 'menu');
  var h = title ? "<div class='ct-menu-t'>" + esc(title) + "</div>" : '';
  entries.forEach(function (en, i) {
    if (en.sep) { h += "<div class='ct-menu-sep'></div>"; return; }
    h += "<button type='button' role='menuitem' class='ct-mi" + (en.danger ? ' danger' : '') + "' data-i='" + i + "'" + (en.off ? ' disabled' : '') + "><span class='ct-mi-i' aria-hidden='true'>" + (en.icon || '') + "</span><span class='ct-mi-t'>" + esc(en.label) + (en.hint ? "<small>" + esc(en.hint) + "</small>" : '') + "</span></button>";
  });
  el.innerHTML = h;
  var bg = document.createElement('div'); bg.className = 'ct-menu-bg';
  bg.addEventListener('click', closeMenu); bg.addEventListener('contextmenu', function (e) { e.preventDefault(); closeMenu(); });
  document.body.appendChild(bg); document.body.appendChild(el);
  menuEl = el; menuBg = bg;
  var vw = window.innerWidth, vh = window.innerHeight;
  if (vw <= 560) { el.classList.add('sheet'); bg.classList.add('dim'); }
  else {
    var r = btn.getBoundingClientRect(), w = el.offsetWidth, hh = el.offsetHeight;
    var left = Math.min(Math.max(8, r.right - w), vw - w - 8), top = r.bottom + 6;
    if (top + hh > vh - 8) top = Math.max(8, r.top - hh - 6);
    el.style.left = left + 'px'; el.style.top = top + 'px';
  }
  el.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.ct-mi') : null; if (!b || b.disabled) return;
    var en = entries[+b.getAttribute('data-i')]; closeMenu();
    if (en && en.fn) en.fn();
  });
  document.addEventListener('keydown', menuKey, true); window.addEventListener('resize', closeMenu);
  var f = el.querySelector('.ct-mi:not([disabled])'); if (f) try { f.focus({ preventScroll: true }); } catch (e2) {}
}

/* ── create / join ── */
function openCreateJam() {
  if (!jamOn()) return offMsg();
  injectCss();
  var node = document.createElement('div');
  node.innerHTML = "<p class='ct-hint' style='margin:0 0 12px;line-height:1.5;font-size:13px'>A Jam is a Catalog you share with up to " + JAM_PEOPLE + " people, for example a team that reuses the same prompts. You will be its Host. You can create or join as many Jams as you like.</p>" +
    "<label class='ct-lab'>Jam name<input class='ks-input' id='jmN' maxlength='40' placeholder='e.g. Data team prompts' autocomplete='off'></label>" +
    "<div class='ct-row'><button type='button' class='btn btn-primary' data-k='create'>Create Jam</button></div>";
  var m = window.ksModal('Create a Jam', node, { width: 440 }), inp = node.querySelector('#jmN'), go2 = node.querySelector('[data-k=create]');
  function run() { go2.disabled = true; createJam(inp.value).then(function () { m.close(); }, function () { go2.disabled = false; }); }
  go2.onclick = run; inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
  setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
}
function openJoinJam() {
  if (!jamOn()) return offMsg();
  injectCss();
  var node = document.createElement('div');
  node.innerHTML = "<p class='ct-hint' style='margin:0 0 12px;line-height:1.5;font-size:13px'>Paste the invitation code or link you were sent. Invitations sent in Alio chat also have a Join button on the message.</p>" +
    "<label class='ct-lab'>Invitation code or link<input class='ks-input' id='jmC' placeholder='alio-jam:…' autocomplete='off' autocapitalize='off' spellcheck='false'></label>" +
    "<div class='ct-err' id='jmE' role='alert'></div>" +
    "<div class='ct-row'><button type='button' class='btn btn-primary' data-k='join'>Join Jam</button></div>";
  var m = window.ksModal('Join a Jam', node, { width: 440 }), inp = node.querySelector('#jmC'), er = node.querySelector('#jmE');
  function run() {
    var p = jamParse(inp.value);
    if (!p) { er.textContent = 'That does not look like a Jam invitation. Paste the whole code or link.'; return; }
    m.close(); confirmJoin(p.jid, p.code, 'this Jam');
  }
  node.querySelector('[data-k=join]').onclick = run;
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); inp.addEventListener('input', function () { er.textContent = ''; });
  setTimeout(function () { try { inp.focus(); } catch (e) {} }, 30);
}
function openPlusMenu(btn) {
  if (!jamOn()) return offMsg();
  openMenu(btn, [
    { icon: '＋', label: 'Create a Jam', hint: 'Start a shared Catalog', fn: openCreateJam },
    { icon: '🔗', label: 'Join a Jam', hint: 'Paste an invitation code or link', fn: openJoinJam }
  ]);
}

/* ── add / move / copy a My Catalog text to Jams ── */
function openJamPicker(mode, it) {
  if (!jamOn()) return offMsg();
  injectCss();
  var LBL = { add: ['Add to Jam', 'Add', 'Adds it to the Jams you tick. Your original stays in My Catalog, and a Jam that already has the same text is skipped.'], move: ['Move to Jam', 'Move', 'Puts it in the Jam and removes it from My Catalog.'], copy: ['Copy to Jam', 'Copy', 'Makes a fresh duplicate in the Jam, even if the same text is already there. Your original stays.'] }[mode];
  var node = document.createElement('div'), ids = J.order.slice(), multi = mode === 'add';
  if (!ids.length) {
    node.innerHTML = "<div class='ct-empty' style='margin:0;padding:22px 14px'><div class='ct-eico'>🫙</div><b>You are not in a Jam yet</b><p>Create a Jam or join one with an invitation code, then you can put texts in it.</p><div class='ct-row' style='justify-content:center'><button type='button' class='btn btn-primary' data-k='c'>Create a Jam</button><button type='button' class='btn btn-secondary' data-k='j'>Join a Jam</button></div></div>";
    var m0 = window.ksModal(LBL[0], node, { width: 440 });
    node.querySelector('[data-k=c]').onclick = function () { m0.close(); openCreateJam(); };
    node.querySelector('[data-k=j]').onclick = function () { m0.close(); openJoinJam(); };
    return;
  }
  var chosen = {};
  node.innerHTML = "<p class='ct-hint' style='margin:0 0 10px;line-height:1.5;font-size:12.5px'>" + esc(LBL[2]) + "</p><div class='ct-pick' role='" + (multi ? 'group' : 'radiogroup') + "'></div><div class='ct-row' style='margin-top:12px'><button type='button' class='btn btn-primary' data-k='go' disabled>" + LBL[1] + "</button></div>";
  var list = node.querySelector('.ct-pick'), go2 = node.querySelector('[data-k=go]');
  function draw() {
    list.innerHTML = ids.map(function (id) {
      var d = J.all[id], ok = canIn(d, 'add'), on = !!chosen[id];
      return "<button type='button' class='ct-pk" + (on ? ' on' : '') + "' data-id='" + esc(id) + "'" + (ok ? '' : ' disabled') + " role='" + (multi ? 'checkbox' : 'radio') + "' aria-checked='" + on + "'><span class='ct-pk-box' aria-hidden='true'>" + (on ? '✓' : '') + "</span><span class='ct-pk-t'><b>" + esc(d.name) + "</b><small>" + (ok ? roleLbl(myRoleIn(d)) + ' · ' + d.members.length + ' ' + (d.members.length === 1 ? 'person' : 'people') : 'You cannot add texts here') + "</small></span></button>";
    }).join('');
    go2.disabled = !Object.keys(chosen).length;
  }
  list.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.ct-pk') : null; if (!b || b.disabled) return;
    var id = b.getAttribute('data-id');
    if (multi) { if (chosen[id]) delete chosen[id]; else chosen[id] = 1; } else chosen = chosen[id] ? {} : (function () { var o = {}; o[id] = 1; return o; })();
    draw();
  });
  draw();
  var m = window.ksModal(LBL[0], node, { width: 440 });
  go2.onclick = function () { go2.disabled = true; toJams(mode, it, Object.keys(chosen), m); };
}
function toJams(mode, it, sel, m) {
  if (!editOn()) { m.close(); return offMsg(); }
  var jobs = sel.map(function (jid, n) {
    var d = J.all[jid];
    if (!canIn(d, 'add')) return Promise.resolve({ jid: jid, r: 'denied' });
    return jamPeek(jid).then(function (cur) {
      if (cur.length >= JAM_MAX) return { jid: jid, r: 'full' };
      if (mode !== 'copy' && cur.some(function (x) { return x.t === it.t && x.b === it.b; })) return { jid: jid, r: 'dupe' };
      return jamAddTo(jid, { t: it.t, b: it.b, c: it.c, g: it.g }, n).then(function () { return { jid: jid, r: 'ok' }; });
    }).catch(function (e) { return { jid: jid, r: 'err', e: e }; });
  });
  Promise.all(jobs).then(function (res) {
    var ok = res.filter(function (x) { return x.r === 'ok'; }), dupe = res.filter(function (x) { return x.r === 'dupe'; }), bad = res.filter(function (x) { return x.r !== 'ok' && x.r !== 'dupe'; });
    function nm(a) { return a.length === 1 ? '“' + J.all[a[0].jid].name + '”' : a.length + ' Jams'; }
    if (mode === 'move' && !bad.length) {     /* only take it out of My Catalog once every Jam really has it */
      var a = items().filter(function (x) { return x.id !== it.id; });
      if (saveItems(a)) { toast('Moved to ' + nm(res), 'ok'); paint(); }
    } else if (ok.length || dupe.length) {
      toast((ok.length ? (mode === 'copy' ? 'Copied to ' : 'Added to ') + nm(ok) : '') + (ok.length && dupe.length ? '. ' : '') + (dupe.length ? 'Already in ' + nm(dupe) : '') + (bad.length ? '. Could not reach ' + bad.length + ' other' + (bad.length === 1 ? '' : 's') : ''), bad.length ? 'err' : 'ok');
    }
    if (bad.length && !ok.length && !dupe.length) toast(bad[0].r === 'full' ? 'That Jam is full (' + JAM_MAX + ' texts).' : bad[0].r === 'denied' ? 'You cannot add texts to that Jam.' : jamErr(bad[0].e), 'err');
    else if (bad.length && mode === 'move') toast(bad[0].r === 'full' ? 'That Jam is full, so the text stayed in My Catalog.' : jamErr(bad[0].e) + ' The text stayed in My Catalog.', 'err');
    try { m.close(); } catch (e) {}
  });
}

/* ── Jam settings: people, add people, permissions, name, leave / delete ── */
function openJamPanel() {
  if (!J.d) return; injectCss(); ksBadgesOn();
  var node = document.createElement('div'); node.className = 'ct-jp';
  var d0 = J.d, m = window.ksModal('Jam settings', node, { width: 540, onClose: function () { J.panel = null; } });
  J.panel = { node: node, m: m, jid: d0.id, open: { people: true, add: false, perms: false, gen: false }, perm: {}, res: null };
  node.addEventListener('click', onPanelClick);
  node.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'jpQ') { e.preventDefault(); findPerson(); } else if (e.key === 'Enter' && e.target.id === 'jpName') { e.preventDefault(); renameJam(); } else if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('data-p') === 'profile') { e.preventDefault(); e.target.click(); } });
  node.addEventListener('toggle', function (e) { var k = e.target && e.target.getAttribute && e.target.getAttribute('data-sec'); if (k && J.panel) { if (k.indexOf('perm-') === 0) J.panel.perm[k.slice(5)] = e.target.open; else J.panel.open[k] = e.target.open; } }, true);
  fillPanel();
}
function ksBadgesOn() { try { if (typeof ksStartBadges === 'function') ksStartBadges(); } catch (e) {} }
function avatarHTML(u) {
  var p = null; try { p = dmPerson(u); } catch (e) {}
  var nm = (p && p.name) || 'M', pic = p && p.pic;
  return "<span class='ct-av'>" + (pic ? "<img src='" + esc(pic) + "' alt=''>" : esc((nm[0] || '?').toUpperCase())) + "</span>";
}
function badgesHTML(u) {
  var h = '';
  try { if (typeof dmIsAdminUid === 'function' && dmIsAdminUid(u) && typeof communityOfficialBadgeHTML === 'function') h += communityOfficialBadgeHTML(); } catch (e) {}
  try { if (typeof communityGrantedBadgeHTML === 'function') h += communityGrantedBadgeHTML(u); } catch (e2) {}
  return h ? "<span class='ct-bdg'>" + h + "</span>" : '';
}
function pTitle(k, label, state, open, body) {
  return "<details class='ct-sec' data-sec='" + k + "'" + (open ? ' open' : '') + "><summary><span>" + label + "</span>" + (state ? "<em>" + state + "</em>" : '') + "<i aria-hidden='true'></i></summary><div class='ct-sec-b'>" + body + "</div></details>";
}
function fillPanel() {
  var P = J.panel; if (!P) return;
  var d = J.d, node = P.node;
  if (!d) { try { P.m.close(); } catch (e) {} J.panel = null; return; }
  var keep = {}, act = document.activeElement, actId = act && node.contains(act) ? act.id : '', selS = 0, selE = 0;
  [].forEach.call(node.querySelectorAll('input[id]'), function (i) { keep[i.id] = i.value; });
  if (actId && act.selectionStart != null) { selS = act.selectionStart; selE = act.selectionEnd; }
  var scrollTop = node.scrollTop;
  var me = user.uid, role = roleOf(d, me), host = role === 'owner' || role === 'host', owner = role === 'owner', inviter = canIn(d, 'invite');
  var h = "<div class='ct-jhead'><div class='ct-jname'>🫙 " + esc(d.name) + "</div><div class='ct-hint' style='margin:2px 0 0'>You are " + (owner ? 'the Host' : role === 'host' ? 'a Co-host' : 'a Member') + " · " + d.members.length + " of " + JAM_PEOPLE + " people</div></div>";

  /* people */
  var rows = d.members.slice().sort(function (a, b) {
    var ra = roleOf(d, a) === 'owner' ? 0 : roleOf(d, a) === 'host' ? 1 : 2, rb = roleOf(d, b) === 'owner' ? 0 : roleOf(d, b) === 'host' ? 1 : 2;
    return ra - rb || (pname(a).toLowerCase() < pname(b).toLowerCase() ? -1 : 1);
  }).map(function (u) {
    var r = roleOf(d, u);
    return "<div class='ct-mem'><div class='ct-mem-main' role='link' tabindex='0' data-p='profile' data-u='" + esc(u) + "' aria-label='Open profile of " + esc(realName(u)) + "'>" + avatarHTML(u) +
      "<span class='ct-mem-t'><span class='ct-mem-n'><b>" + esc(realName(u)) + (u === me ? " <span class='ct-hint' style='margin:0'>(you)</span>" : '') + "</b>" + badgesHTML(u) + "</span><span class='ct-role r-" + r + "'>" + roleLbl(r) + "</span></span></div>" +
      "<button type='button' class='ct-ico ct-dots' data-p='menu' data-u='" + esc(u) + "' aria-label='Actions for " + esc(realName(u)) + "' aria-haspopup='menu'>⋮</button></div>";
  }).join('');
  h += pTitle('people', 'People', String(d.members.length), P.open.people, "<div class='ct-mems'>" + rows + "</div>");

  /* add people / invite */
  var add = '';
  if (!inviter) add = "<p class='ct-hint' style='margin:0;line-height:1.5;font-size:13px'>Only the host and co-hosts can add or invite people to this Jam.</p>";
  else if (d.members.length >= JAM_PEOPLE) add = "<p class='ct-hint' style='margin:0;line-height:1.5;font-size:13px'>This Jam is full (" + JAM_PEOPLE + " people).</p>";
  else {
    var res = P.res, rh = '';
    if (res && res.msg) rh = "<div class='ct-res-msg'>" + esc(res.msg) + "</div>";
    else if (res && res.uid) {
      var inJam = d.members.indexOf(res.uid) > -1;
      rh = "<div class='ct-res'>" + avatarHTML(res.uid) + "<span class='ct-mem-t'><span class='ct-mem-n'><b>" + esc(res.name) + "</b>" + badgesHTML(res.uid) + "</span><span class='ct-hint' style='margin:0'>@" + esc(res.username) + "</span></span>" +
        (inJam ? "<span class='ct-role'>In this Jam</span>" : "<button type='button' class='btn btn-primary' data-p='add'>Add</button>") + "</div>";
    }
    add = "<label class='ct-lab' style='margin-bottom:8px'>Add by username<div class='ct-srow'><input class='ks-input' id='jpQ' maxlength='21' placeholder='Exact username, e.g. alex' autocomplete='off' autocapitalize='off' spellcheck='false'><button type='button' class='btn btn-secondary' data-p='find'>Search</button></div></label>" + rh +
      "<p class='ct-hint' style='margin:8px 0 12px;line-height:1.5;font-size:12px'>If someone has turned off “Let people add me to groups or Jams”, you can send them an invitation instead. They choose whether to join.</p>" +
      "<div class='ct-sub-h'>Invite another way</div><div class='ct-row'><button type='button' class='btn btn-secondary' data-p='invite'>💬 Send in Alio DM</button><button type='button' class='btn btn-secondary' data-p='copylink'>🔗 Copy link</button><button type='button' class='btn btn-secondary' data-p='copycode'>⌗ Copy code</button></div>" +
      (host ? "<div class='ct-row' style='margin-top:6px'><button type='button' class='btn btn-ghost' data-p='resetcode' style='font-size:12.5px'>Reset invite link &amp; code</button></div>" : '');
  }
  h += pTitle('add', 'Add people &amp; invite', '', P.open.add, add);

  /* who can */
  var perms = Object.keys(JAM_LBL).map(function (k) {
    var v = d.perms[k], lab = v === 'all' ? 'Everyone' : 'Host & co-hosts';
    var body = "<p class='ct-hint' style='margin:0 0 8px;line-height:1.45;font-size:12.5px'>" + esc(JAM_WHO[k]) + "</p>" + (host
      ? "<div class='ct-seg' role='radiogroup' aria-label='" + esc(JAM_LBL[k]) + "'><button type='button' role='radio' aria-checked='" + (v === 'all') + "' data-p='perm' data-k='" + k + "' data-v='all' class='" + (v === 'all' ? 'on' : '') + "'>Everyone</button><button type='button' role='radio' aria-checked='" + (v === 'hosts') + "' data-p='perm' data-k='" + k + "' data-v='hosts' class='" + (v === 'hosts' ? 'on' : '') + "'>Host &amp; co-hosts</button></div>"
      : "<div class='ct-hint' style='margin:0;font-size:12.5px'>Only the host and co-hosts can change this.</div>");
    return "<details class='ct-pd' data-sec='perm-" + k + "'" + (P.perm[k] ? ' open' : '') + "><summary><span>" + esc(JAM_LBL[k]) + "</span><em class='" + (v === 'all' ? 'all' : 'hosts') + "'>" + (v === 'all' ? 'Everyone' : 'Host &amp; co-hosts') + "</em><i aria-hidden='true'></i></summary><div class='ct-pd-b'>" + body + "</div></details>";
  }).join('');
  h += pTitle('perms', 'Who can…', '', P.open.perms, "<div class='ct-pds'>" + perms + "</div><p class='ct-hint' style='margin:8px 0 0;line-height:1.5;font-size:12px'>Add, edit, delete and direct adds are enforced by the server. Everyone in the Jam can always view, search and copy.</p>");

  /* general + leave/delete */
  var gen = host ? "<label class='ct-lab' style='margin-bottom:8px'>Jam name<div class='ct-srow'><input class='ks-input' id='jpName' maxlength='40' value='" + esc(d.name) + "'><button type='button' class='btn btn-secondary' data-p='rename'>Save</button></div></label>" : "<p class='ct-hint' style='margin:0;font-size:13px'>Only the host and co-hosts can rename this Jam.</p>";
  h += pTitle('gen', 'Name', '', P.open.gen, gen);
  h += "<div class='ct-danger-zone'>" + (owner
    ? "<button type='button' class='ct-danger' data-p='delete'><svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14'/></svg>Delete Jam</button>" + (d.members.length > 1 ? "<span class='ct-hint'>To leave instead, make someone else the Host first.</span>" : '')
    : "<button type='button' class='ct-danger' data-p='leave'>Leave Jam</button>") + "</div>";
  node.innerHTML = h; node.scrollTop = scrollTop;
  Object.keys(keep).forEach(function (id) { var el = node.querySelector('#' + id); if (el) el.value = keep[id]; });
  if (actId) { var f = node.querySelector('#' + actId); if (f) { try { f.focus({ preventScroll: true }); if (f.setSelectionRange) f.setSelectionRange(selS, selE); } catch (e3) {} } }
}
function renameJam() {
  if (!J.panel || !J.d) return;
  var n = (J.panel.node.querySelector('#jpName') || {}).value; n = String(n || '').trim().slice(0, 40);
  if (!n) return toast('Give the Jam a name.', 'err');
  if (n === J.d.name) return;
  jamPatch({ name: n }).then(function () { toast('Saved', 'ok'); }, function (er) { toast(jamErr(er), 'err'); });
}
function memberMenu(btn, u) {
  var d = J.d, me = user.uid, out = [];
  out.push({ icon: '👤', label: u === me ? 'View my profile' : 'View profile', fn: function () { openProfile(u); } });
  if (canManage(d, u)) {
    var isH = d.hosts.indexOf(u) > -1;
    out.push({ sep: 1 });
    out.push({ icon: isH ? '⬇️' : '⭐', label: isH ? 'Remove as co-host' : 'Make co-host', hint: isH ? 'They become a regular member' : 'They can manage members and settings', fn: function () { setCohost(u, !isH); } });
    if (myRole() === 'owner') out.push({ icon: '👑', label: 'Make Host', hint: 'Hand the Jam over. You stay a co-host', fn: function () { makeOwner(u); } });
    out.push({ icon: '🚫', label: 'Remove from Jam', danger: true, fn: function () { window.ksAsk('Remove ' + realName(u) + ' from the Jam? They keep any texts they saved to their own Catalog.', function () { removePerson(u); }, { okText: 'Remove', title: 'Remove person' }); } });
  } else if (u === me && myRole() !== 'owner') {
    out.push({ sep: 1 });
    out.push({ icon: '🚪', label: 'Leave Jam', danger: true, fn: leaveAsk });
  }
  openMenu(btn, out, realName(u));
}
function openProfile(u) {
  if (J.panel) { try { J.panel.m.close(); } catch (e) {} J.panel = null; }
  try { openUserProfile(u); } catch (e) { toast('Could not open the profile.', 'err'); }
}
function leaveAsk() {
  window.ksAsk('Leave this Jam? You will no longer see its texts. Texts you saved to your own Catalog stay.', function () { if (J.panel) { try { J.panel.m.close(); } catch (e) {} J.panel = null; } leaveJam(); }, { okText: 'Leave', title: 'Leave Jam' });
}
function onPanelClick(e) {
  var b = e.target.closest ? e.target.closest('[data-p]') : null; if (!b || !J.d) return;
  if (e.target.closest && e.target.closest('.alio-vbadge')) return;     /* the badge's own info card */
  var p = b.getAttribute('data-p'), u = b.getAttribute('data-u'), d = J.d;
  if (p === 'profile') openProfile(u);
  else if (p === 'menu') memberMenu(b, u);
  else if (p === 'rename') renameJam();
  else if (p === 'find') findPerson();
  else if (p === 'add') { if (J.panel && J.panel.res && J.panel.res.uid) addPerson(J.panel.res, b); }
  else if (p === 'perm') {
    var k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
    if (!isHost() || d.perms[k] === v) return;
    var perms = {}; Object.keys(JAM_DEF).forEach(function (x) { perms[x] = d.perms[x]; }); perms[k] = v === 'all' ? 'all' : 'hosts';
    jamPatch({ perms: perms }).then(function () { toast(JAM_LBL[k] + ': ' + (v === 'all' ? 'Everyone' : 'Host & co-hosts'), 'ok'); }, function (er) { toast(jamErr(er), 'err'); fillPanel(); });
  }
  else if (p === 'invite') { if (!canInvite()) return; var txt = inviteText(d); if (J.panel) { try { J.panel.m.close(); } catch (e1) {} J.panel = null; } chatPicker(function () { return Promise.resolve(txt); }); }
  else if (p === 'copycode') { if (canInvite()) copyText(inviteCode(d)).then(function () { toast('Invite code copied', 'ok'); }, function () { toast('Could not copy.', 'err'); }); }
  else if (p === 'copylink') { if (canInvite()) copyText(inviteLink(d)).then(function () { toast('Invite link copied', 'ok'); }, function () { toast('Could not copy.', 'err'); }); }
  else if (p === 'resetcode') window.ksAsk('Old invite links and codes stop working. People already in the Jam stay.', function () { jamPatch({ code: newId(32) }).then(function () { toast('Invite link and code reset', 'ok'); }, function (er) { toast(jamErr(er), 'err'); }); }, { okText: 'Reset', title: 'Reset invite?', danger: false });
  else if (p === 'leave') leaveAsk();
  else if (p === 'delete') deleteJam();
}


/* ── list / search ── */
function score(it, words) {
  var t = it.t.toLowerCase(), c = it.c.toLowerCase(), g = it.g.join(' ').toLowerCase(), b = it.b.toLowerCase(), s = 0, i, x, w;
  for (i = 0; i < words.length; i++) {
    w = words[i]; x = 0;
    if (t.indexOf(w) > -1) x += 3;
    if (g.indexOf(w) > -1) x += 2;
    if (c.indexOf(w) > -1) x += 2;
    if (b.indexOf(w) > -1) x += 1;
    if (!x) return 0;
    s += x;
  }
  return s;
}
function view() {
  var a = curItems(), words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
  if (st.cat === '@pin') a = a.filter(function (i) { return i.p; });
  else if (st.cat === '@none') a = a.filter(function (i) { return !i.c; });
  else if (st.cat) a = a.filter(function (i) { return i.c === st.cat; });
  if (words.length) a.forEach(function (i) { i._s = score(i, words); });
  if (words.length) a = a.filter(function (i) { return i._s > 0; });
  a.sort(function (x, y) {
    if (words.length && x._s !== y._s) return y._s - x._s;
    if (scope === 'jam') return st.sort === 'az' ? (x.t.toLowerCase() < y.t.toLowerCase() ? -1 : 1) : st.sort === 'new' ? y.cr - x.cr : y.u - x.u;
    if (x.p !== y.p) return y.p - x.p;
    if (st.sort === 'most') return (y.n - x.n) || (y.lu - x.lu);
    if (st.sort === 'new') return y.cr - x.cr;
    if (st.sort === 'az') return x.t.toLowerCase() < y.t.toLowerCase() ? -1 : 1;
    return (y.lu - x.lu) || (y.cr - x.cr);
  });
  return a;
}
function paintChips() {
  var el = document.getElementById('ctChips'); if (!el) return;
  var jm = scope === 'jam', a = curItems(), cats = catsOf(a), none = a.filter(function (i) { return !i.c; }).length, pins = a.filter(function (i) { return i.p; }).length;
  function chip(key, label, n) { return "<button type='button' class='ct-chip' data-cat='" + esc(key) + "' aria-pressed='" + (st.cat === key) + "'>" + label + (n != null ? " <i>" + n + "</i>" : "") + "</button>"; }
  var h = chip('', 'All', a.length);
  if (pins) h += chip('@pin', '★ Starred', pins);
  cats.forEach(function (c) { h += chip(c, esc(c), a.filter(function (i) { return i.c === c; }).length); });
  if (none && cats.length) h += chip('@none', 'Uncategorised', none);
  if (editOn() && !jm) h += "<button type='button' class='ct-chip ct-add' data-a='addcat'>＋ Category</button>";
  if (cats.length && editOn() && !jm) h += "<button type='button' class='ct-chip ct-add' data-a='mancat' aria-label='Manage categories'>⚙</button>";
  el.innerHTML = h;
}
var DOTS = "<svg viewBox='0 0 24 24' width='18' height='18' fill='currentColor' aria-hidden='true'><circle cx='12' cy='5' r='1.9'/><circle cx='12' cy='12' r='1.9'/><circle cx='12' cy='19' r='1.9'/></svg>";
function paintList() {
  var el = document.getElementById('ctList'); if (!el) return;
  var jm = scope === 'jam' && !!J.d, all = curItems(), a = view();
  var cnt = document.getElementById('ctCount'); if (cnt) cnt.textContent = all.length + ' / ' + (jm ? JAM_MAX : MAX);
  if (jm && !J.ready) { el.innerHTML = "<div class='ct-empty'><b>Opening the Jam…</b></div>"; return; }
  if (!all.length) {
    var addOk = editOn() && (!jm || can('add'));
    el.innerHTML = jm
      ? "<div class='ct-empty'><div class='ct-eico'>🫙</div><b>This Jam is empty</b><p>" + (addOk ? 'Use ＋ New text above to add the prompts and replies your team reuses, or put some in from My Catalog (⋮ on a text → Add to Jam).' : 'Nothing has been added yet. The host and co-hosts decide who can add texts.') + "</p></div>"
      : "<div class='ct-empty'><div class='ct-eico'>📚</div><b>Your Catalog is empty</b><p>Save the texts you keep re-typing or re-searching for: AI prompts, disclaimers, replies, work notes. " + (addOk ? 'Use ＋ New text above to add one. ' : '') + "It is a single tap to copy, on every device.</p></div>";
    return;
  }
  if (!a.length) { el.innerHTML = "<div class='ct-empty'><b>Nothing found</b><p>Try different words or switch category.</p></div>"; return; }
  el.innerHTML = a.map(function (i) {
    var prev = i.b.replace(/\s+/g, ' ').slice(0, 170) + (i.b.length > 170 ? '…' : '');
    var note = jm ? esc(pname(i.by)) + (i.ed && i.ed !== i.by ? ' · edited by ' + esc(pname(i.ed)) : '') + ' · ' + when(i.u) : (i.n ? i.n + '× · ' : '') + fmtAgo(i.lu);
    return "<article class='ct-card' data-id='" + esc(i.id) + "'>" +
      "<div class='ct-top'><h3>" + (!jm && i.p ? "<span class='ct-star' title='Starred' aria-label='Starred'>★</span>" : '') + esc(i.t) + "</h3><div class='ct-tools'><button type='button' class='ct-ico ct-dots' data-a='menu' aria-label='More actions for " + esc(i.t) + "' aria-haspopup='menu'>" + DOTS + "</button></div></div>" +
      "<div class='ct-meta'>" + (i.c ? "<span class='ct-tag ct-cat'>" + esc(i.c) + "</span>" : '') + i.g.map(function (g) { return "<span class='ct-tag'>#" + esc(g) + "</span>"; }).join('') + "</div>" +
      "<p class='ct-prev'>" + esc(prev) + "</p>" +
      "<div class='ct-act'><button type='button' class='btn btn-primary' data-a='copy'>Copy</button><span class='ct-uses'>" + note + "</span></div></article>";
  }).join('');
}
function paintStatus() {
  var el = document.getElementById('ctSync'); if (!el) return;
  if (scope === 'jam' && J.d) { el.textContent = '🫙 Live · shared with ' + J.d.members.length + ' ' + (J.d.members.length === 1 ? 'person' : 'people'); return; }
  var s = status;
  el.textContent = s === 'paused' ? '☁️ Sync paused by the admin — saved on this device' : s === 'sync' ? '☁️ Syncing…' : s === 'off' ? '☁️ Offline — saved on this device, syncs later' : s === 'err' ? '☁️ Sync problem — will retry' : s === 'wait' ? '☁️ Waiting for your choice…' : '☁️ Synced to your account';
}
function jamHue(name) { var h = 0, i; for (i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360; return h; }
var GEAR = "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z'/></svg>";
/* navigation: My Catalog (square-ish, accent outline), then one pill per Jam, then a permanent ＋ pill */
function paintNav() {
  var el = document.getElementById('ctNav'); if (!el) return;
  var jm = scope === 'jam' && !!J.d, on = jamOn();
  if (!on && !J.order.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = '';
  var h = "<div class='ct-nav-in' role='tablist' aria-label='My Catalog and Jams'>" +
    "<button type='button' class='ct-tab-me' role='tab' aria-selected='" + !jm + "' data-a='scope-me'><span aria-hidden='true'>📚</span><span>My Catalog</span></button><span class='ct-nav-div' aria-hidden='true'></span>";
  J.order.forEach(function (id) {
    var d = J.all[id], act = jm && J.d.id === id;
    h += "<button type='button' class='ct-tab-jam" + (act ? ' on' : '') + "' role='tab' aria-selected='" + act + "' data-a='scope-jam' data-id='" + esc(id) + "' style='--jh:hsl(" + jamHue(d.name) + " 62% 56%)' title='" + esc(d.name) + "'><span class='ct-dot' aria-hidden='true'></span><span class='ct-tab-n'>" + esc(d.name) + "</span></button>";
    if (act) h += "<button type='button' class='ct-gear' data-a='jamset' aria-label='Settings for " + esc(d.name) + "' title='Jam settings'>" + GEAR + "</button>";
  });
  if (on) h += "<button type='button' class='ct-plus' data-a='plus' aria-label='Create or join a Jam' aria-haspopup='menu' title='Create or join a Jam'>＋</button>";
  h += "</div>";
  el.innerHTML = h;
  var act2 = el.querySelector('.ct-tab-me[aria-selected=true],.ct-tab-jam.on');
  if (act2 && el.firstChild && el.firstChild.scrollTo) { var box = el.firstChild, l = act2.offsetLeft - 12; if (act2.offsetLeft + act2.offsetWidth > box.scrollLeft + box.clientWidth || l < box.scrollLeft) box.scrollLeft = Math.max(0, l - 8); }
}
function paintHead() {
  var el = document.getElementById('ctHead'); if (!el) return;
  var jm = scope === 'jam' && !!J.d, add = jm ? (editOn() && can('add')) : editOn();
  el.innerHTML = "<div class='ct-ht'><h2>" + (jm ? '🫙 ' + esc(J.d.name) : '📚 My Catalog') + (jm ? " <span class='ct-role r-" + myRole() + "'>" + roleLbl(myRole()) + "</span>" : '') + "</h2><div class='ct-sub'>" + (jm ? 'Shared with everyone in this Jam' : 'Your private library of texts to reuse') + " · <span id='ctCount'></span></div><div class='ct-sync' id='ctSync'></div></div>" +
    (add ? "<button type='button' class='btn btn-primary' data-a='new'>＋ New text</button>" : '');
}
var barFor = '';
function paintBar() {
  var q = document.getElementById('ctQ'), so = document.getElementById('ctSort'); if (!q || !so) return;
  var jm = scope === 'jam' && !!J.d, key = jm ? 'j' : 'm';
  if (jm && st.sort === 'most') st.sort = 'used';
  if (barFor !== key) {
    so.innerHTML = jm ? "<option value='used'>Recently updated</option><option value='new'>Newest</option><option value='az'>A–Z</option>" : "<option value='used'>Recently used</option><option value='most'>Most used</option><option value='new'>Newest</option><option value='az'>A–Z</option>";
    barFor = key;
  }
  so.value = st.sort;
  if (document.activeElement !== q && q.value !== st.q) q.value = st.q;
}
function paintFoot() {
  var el = document.getElementById('ctFoot'); if (!el) return;
  var jm = scope === 'jam' && !!J.d;
  el.innerHTML = (!jm && backupOn() ? "<div class='ct-foot'><button type='button' class='btn btn-ghost' data-a='export'>Export backup</button><button type='button' class='btn btn-ghost' data-a='import'>Import</button><input type='file' id='ctFile' accept='application/json,.json' hidden></div>" : '') +
    (jm ? "<p class='ct-priv'>👥 Everyone in this Jam can see, search and copy these texts. Keep passwords and card numbers out of it.</p>" : "<p class='ct-priv'>🔒 Only you can see your Catalog. It is not end-to-end encrypted, so don't store passwords or card numbers.</p>");
  var cf = document.getElementById('ctFile');
  if (cf) cf.addEventListener('change', function () { importFile(this.files[0]); this.value = ''; });
}
function paintAll() { paintNav(); paintHead(); paintBar(); paintChips(); paintList(); paintStatus(); paintFoot(); }
function paint() {
  var root = document.getElementById('ctBody'); if (!root) return;
  if (!user) {
    built = false;
    root.innerHTML = "<div class='ct-empty'><div class='ct-eico'>📚</div><b>Sign in to use your Catalog</b><p>Your Catalog is private to your account and syncs across your devices, so you need to be signed in.</p><button type='button' class='btn btn-primary' onclick=\"go('auth')\">Sign in</button></div>";
    return;
  }
  if (scope === 'jam' && !J.d) scope = 'me';
  if (!built || !document.getElementById('ctList')) {
    barFor = '';
    root.innerHTML =
      "<div id='ctNav' class='ct-nav'></div><div class='ct-head' id='ctHead'></div>" +
      "<div class='ct-bar'><input type='search' class='ks-input' id='ctQ' placeholder='Search titles, text, tags…' maxlength='80' autocomplete='off' value='" + esc(st.q) + "'><select class='ks-input' id='ctSort' aria-label='Sort'></select></div>" +
      "<div class='ct-chips' id='ctChips'></div><div id='ctList' class='ct-list'></div><div id='ctFoot'></div>";
    built = true;
    var q = document.getElementById('ctQ'), so = document.getElementById('ctSort'), t;
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = q.value; paintList(); }, 120); });
    so.addEventListener('change', function () { st.sort = so.value; paintList(); });
  }
  if (!root.__ct) { root.addEventListener('click', onClick); root.__ct = 1; }
  paintAll();
}
function byId(id) { return curItems().filter(function (x) { return x.id === id; })[0]; }
function togglePin(it) {
  if (!editOn()) return offMsg();
  var all = items(); all.forEach(function (x) { if (x.id === it.id) x.p = x.p ? 0 : 1; });
  saveItems(all); paintChips(); paintList();
}
function confirmDeleteMine(it) {
  if (!editOn()) return offMsg();
  window.ksAsk('Delete “' + it.t.slice(0, 50) + '”? It will be removed from all your devices.', function () { saveItems(items().filter(function (x) { return x.id !== it.id; })); paint(); }, { okText: 'Delete', title: 'Delete text' });
}
function confirmDeleteJamText(it) {
  if (!can('del')) { toast('Only the host and co-hosts can delete texts in this Jam.', 'err'); return; }
  window.ksAsk('Delete “' + it.t.slice(0, 50) + '” for everyone in the Jam?', function () { jamDelete(it.id).then(function () { toast('Deleted', 'ok'); }, function (e) { toast(jamErr(e), 'err'); }); }, { okText: 'Delete', title: 'Delete text' });
}
/* the ⋮ menu of a text card; Copy stays on the card itself */
function cardMenu(btn, it) {
  var jm = scope === 'jam' && !!J.d, out = [];
  function guard(f) { return function () { if (!editOn()) return offMsg(); f(); }; }
  if (!jm) {
    out.push({ icon: '＋', label: 'Add to Jam', hint: 'Keep it here too', fn: guard(function () { openJamPicker('add', it); }) });
    out.push({ icon: '➡️', label: 'Move to Jam', hint: 'Take it out of My Catalog', fn: guard(function () { openJamPicker('move', it); }) });
    out.push({ icon: '⧉', label: 'Copy to Jam', hint: 'Make a duplicate there', fn: guard(function () { openJamPicker('copy', it); }) });
    out.push({ sep: 1 });
    out.push({ icon: '↗', label: 'Share', fn: function () { openShare(it); } });
    out.push({ icon: it.p ? '☆' : '★', label: it.p ? 'Unstar' : 'Star', fn: function () { togglePin(it); } });
    out.push({ icon: PENCIL, label: 'Edit', fn: guard(function () { openEditor(it.id); }) });
    out.push({ sep: 1 });
    out.push({ icon: '🗑', label: 'Delete', danger: true, fn: function () { confirmDeleteMine(it); } });
  } else {
    if (editOn() && can('edit')) out.push({ icon: PENCIL, label: 'Edit', fn: function () { openEditor(it.id); } });
    out.push({ icon: '＋', label: 'Save to My Catalog', fn: function () { addShared({ t: it.t, b: it.b, c: it.c, g: it.g }); } });
    if (can('share')) out.push({ icon: '↗', label: 'Share', fn: function () { openShare(it); } });
    if (can('del')) { out.push({ sep: 1 }); out.push({ icon: '🗑', label: 'Delete', danger: true, fn: function () { confirmDeleteJamText(it); } }); }
  }
  openMenu(btn, out);
}
function onClick(e) {
  var b = e.target.closest ? e.target.closest('button,[data-cat],.ct-card') : null;
  if (!b) return;
  var cat = b.getAttribute('data-cat');
  if (cat != null) { st.cat = cat; paintChips(); paintList(); return; }
  var a = b.getAttribute('data-a'), card = b.closest('.ct-card'), id = card && card.getAttribute('data-id'), jm = scope === 'jam' && !!J.d;
  if (a === 'scope-me') { if (scope !== 'me') selectJam(''); return; }
  if (a === 'scope-jam') { var jid = b.getAttribute('data-id'); if (!J.d || J.d.id !== jid || scope !== 'jam') selectJam(jid); return; }
  if (a === 'jamset') return openJamPanel();
  if (a === 'plus') return openPlusMenu(b);
  if (a === 'new') return editOn() ? openEditor() : offMsg();
  if (a === 'addcat') return editOn() ? addCat() : offMsg();
  if (a === 'mancat') return editOn() ? manageCats() : offMsg();
  if (a === 'export') return backupOn() ? exportAll() : offMsg();
  if (a === 'import') { var cf2 = document.getElementById('ctFile'); return backupOn() && cf2 ? cf2.click() : offMsg(); }
  if (a === 'menu' && id) { var mit = byId(id); if (mit) cardMenu(b, mit); return; }
  if (a === 'copy' && id) { var it = byId(id); if (it) doCopy(it); return; }
  if (b.classList.contains('ct-card') && id) {
    if (jm && !(editOn() && can('edit'))) { var ri = byId(id); if (ri) readShared({ t: ri.t, b: ri.b, c: ri.c, g: ri.g }); return; }
    if (editOn()) openEditor(id);
  }
}
function ctRefresh() { if (document.getElementById('ctBody')) { built = built && !!user; paint(); } }
window.ctRefresh = ctRefresh;

function renderCatalog() {
  injectCss();
  st = { q: '', cat: '', sort: st.sort || 'used' }; built = false; if (!J.d) scope = 'me';
  appEl.innerHTML = "<div class='page-wrap ct' id='ctRoot'><div class='back-row'><button class='back-btn' type='button' onclick=\"go('home')\">← Home</button></div><div id='ctBody'></div></div>";
  if (ctOff) ctOff();
  ctOff = onStatus(function () { if (!document.getElementById('ctBody')) { if (ctOff) { ctOff(); ctOff = null; } return; } if (!user !== !built) paint(); else paintStatus(); });
  paint();
}

function injectCss() {
  if (document.getElementById('ct-css')) return;
  var s = document.createElement('style'); s.id = 'ct-css';
  s.textContent =
    ".ct h2{margin:0}.ct-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}" +
    ".ct-sub{color:var(--muted);font-size:13px;margin-top:3px}.ct-sync{color:var(--muted);font-size:12px;margin-top:3px}" +
    ".ct-bar{display:flex;gap:8px;margin:14px 0 4px}.ct-bar input{flex:1;min-width:0}.ct-bar select{flex:0 0 auto;width:auto}" +
    ".ct-chips{display:flex;gap:7px;overflow-x:auto;padding:10px 0 6px;scrollbar-width:none}.ct-chips::-webkit-scrollbar{display:none}" +
    ".ct-chip{flex:0 0 auto;min-height:36px;padding:0 13px;border-radius:99px;border:1.5px solid var(--border);background:var(--surface2);color:var(--muted);font:600 12.5px 'DM Sans',sans-serif;cursor:pointer;white-space:nowrap}" +
    ".ct-chip i{font-style:normal;opacity:.7;margin-left:3px}.ct-chip[aria-pressed=true]{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#14110a;border-color:transparent}" +
    ".ct-add{border-style:dashed}" +
    ".ct-list{display:flex;flex-direction:column;gap:10px;margin-top:6px}" +
    ".ct-card{padding:14px 15px 12px;border-radius:18px;background:var(--surface2);border:1px solid var(--border);cursor:pointer}" +
    ".ct-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.ct-top h3{margin:0;min-width:0;font-size:15.5px;line-height:1.3;color:var(--text);word-break:break-word}" +
    ".ct-pin{flex:0 0 auto;border:0;background:transparent;color:var(--accent);font-size:22px;line-height:1;min-width:36px;min-height:36px;cursor:pointer}" +
    ".ct-tools{flex:0 0 auto;display:flex;align-items:center;margin:-4px -6px 0 0}" +
    ".ct-ico{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;color:var(--muted);min-width:36px;min-height:36px;border-radius:99px;cursor:pointer}.ct-ico:hover{color:var(--text);background:var(--surface)}" +
    ".ct-sh{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;margin:0 0 8px;border-radius:14px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font:inherit;cursor:pointer}" +
    ".ct-sh b{display:block;font-size:14.5px}.ct-sh small{display:block;color:var(--muted);font-size:12.5px;line-height:1.4;margin-top:2px}.ct-sh-i{font-size:22px;flex:0 0 auto}" +
    ".ct-sh-main{border-color:var(--accent)}" +
    ".ct-scope{display:flex;gap:7px;overflow-x:auto;padding:12px 0 0;scrollbar-width:none}.ct-scope::-webkit-scrollbar{display:none}" +
    ".ct-save{font-size:20px;font-weight:600}" +
    ".ct-jp{max-height:72vh;overflow:auto}.ct-jh{margin:16px 0 8px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}" +
    ".ct-person{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;padding:7px 0}.ct-pn{font-size:14px;font-weight:600;min-width:0;word-break:break-word}.ct-pa{display:flex;flex-wrap:wrap;gap:4px}.ct-pa .btn{min-height:32px;padding:0 10px;font-size:12.5px}" +
    ".ct-badge{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:99px;border:1px solid var(--border);color:var(--muted);margin-left:5px;vertical-align:1px}" +
    ".ct-perm{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;font-size:14px}.ct-perm .ks-input{width:auto;min-width:150px}.ct-perm b{font-weight:600;color:var(--muted);font-size:13px}" +
    ".ct-read{white-space:pre-wrap;word-break:break-word;max-height:50vh;overflow:auto;padding:12px 13px;border-radius:12px;border:1px solid var(--border);background:var(--surface2);font-size:14px;line-height:1.55}" +
    ".ct-meta{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0 0}.ct-meta:empty{display:none}" +
    ".ct-tag{font-size:11.5px;padding:2px 9px;border-radius:99px;border:1px solid var(--border);color:var(--muted)}.ct-cat{color:var(--text);font-weight:600}" +
    ".ct-prev{margin:8px 0 10px;color:var(--muted);font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word}" +
    ".ct-act{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ct-uses{margin-left:auto;color:var(--muted);font-size:11.5px}" +
    ".ct-empty{text-align:center;padding:34px 18px;border:1.5px dashed var(--border);border-radius:18px;color:var(--muted);margin-top:14px}.ct-empty b{color:var(--text);font-size:16px}.ct-empty p{margin:8px auto 14px;max-width:420px;line-height:1.5;font-size:13.5px}.ct-eico{font-size:34px;margin-bottom:6px}" +
    ".ct-foot{display:flex;gap:8px;margin-top:16px}.ct-priv{color:var(--muted);font-size:12px;line-height:1.5;margin:10px 0 0}" +
    ".ct-lab{display:block;font-size:13px;font-weight:600;margin:0 0 12px;color:var(--text)}.ct-lab .ks-input{display:block;width:100%;margin-top:5px;box-sizing:border-box;font-weight:400}.ct-hint{font-weight:400;color:var(--muted);font-size:11.5px;margin-left:6px}" +
    ".ct-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.ct-del{color:#e5484d!important}" +
    ".ct-mrow{display:flex;gap:6px;margin-bottom:8px;align-items:center}.ct-mrow input{flex:1;min-width:0}" +
    ".ct-ht{min-width:0}.ct-ht h2{display:flex;align-items:center;gap:8px;flex-wrap:wrap;word-break:break-word}" +
    ".ct-nav{margin:12px -2px 2px}.ct-nav-in{display:flex;align-items:center;gap:8px;overflow-x:auto;padding:4px 2px 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.ct-nav-in::-webkit-scrollbar{display:none}" +
    ".ct-tab-me{flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;min-height:42px;padding:0 15px;border-radius:13px;border:1.5px solid var(--accent);background:transparent;color:var(--text);font:700 13.5px 'DM Sans',sans-serif;cursor:pointer;white-space:nowrap}" +
    ".ct-tab-me[aria-selected=true]{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#14110a;border-color:transparent;box-shadow:0 4px 16px var(--accent-glow)}" +
    ".ct-nav-div{flex:0 0 1px;align-self:stretch;margin:7px 3px;background:var(--border)}" +
    ".ct-tab-jam{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;min-height:40px;max-width:210px;padding:0 15px 0 12px;border-radius:99px;border:1.5px solid var(--border);background:var(--surface2);color:var(--muted);font:600 13px 'DM Sans',sans-serif;cursor:pointer}" +
    ".ct-tab-jam .ct-tab-n{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ct-dot{flex:0 0 9px;width:9px;height:9px;border-radius:50%;background:var(--jh,var(--accent))}" +
    ".ct-tab-jam:hover{color:var(--text)}.ct-tab-jam.on{color:var(--text);border-color:var(--jh,var(--accent));box-shadow:inset 0 0 0 1px var(--jh,var(--accent))}" +
    ".ct-gear{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;margin-left:-3px;border-radius:50%;border:1.5px solid var(--border);background:transparent;color:var(--muted);cursor:pointer}.ct-gear:hover{color:var(--text);background:var(--surface2)}" +
    ".ct-plus{position:sticky;right:2px;flex:0 0 auto;margin-left:auto;display:inline-flex;align-items:center;justify-content:center;min-width:56px;height:40px;padding:0 16px;border-radius:99px;border:1.5px dashed var(--accent);background:var(--bg);color:var(--accent);font:600 22px/1 'DM Sans',sans-serif;cursor:pointer;box-shadow:-14px 0 12px -2px var(--bg)}.ct-plus:hover{background:var(--surface2)}" +
    ".ct-tab-me:focus-visible,.ct-tab-jam:focus-visible,.ct-gear:focus-visible,.ct-plus:focus-visible,.ct-mi:focus-visible,.ct-mem-main:focus-visible{outline:2px solid var(--accent);outline-offset:2px}" +
    ".ct-star{color:var(--accent);margin-right:5px;font-size:14px}.ct-dots{color:var(--muted)}" +
    ".ct-role{display:inline-flex;align-items:center;font:700 10.5px 'DM Sans',sans-serif;padding:2px 8px;border-radius:99px;border:1px solid var(--border);color:var(--muted);white-space:nowrap;vertical-align:2px}" +
    ".ct-role.r-owner{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#14110a;border-color:transparent}.ct-role.r-host{border-color:var(--accent);color:var(--accent)}" +
    ".ct-menu-bg{position:fixed;inset:0;z-index:2147483190}.ct-menu-bg.dim{background:rgba(5,7,14,.5)}" +
    ".ct-menu{position:fixed;z-index:2147483200;min-width:228px;max-width:min(330px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;padding:6px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.45);animation:ctPop .12s ease-out}" +
    "@keyframes ctPop{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}" +
    ".ct-menu.sheet{left:0;right:0;bottom:0;top:auto;max-width:none;max-height:82vh;border-radius:20px 20px 0 0;padding:8px 8px calc(14px + env(safe-area-inset-bottom,0px));animation:ctUp .18s ease-out}@keyframes ctUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}" +
    ".ct-menu-t{padding:6px 10px 4px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}.ct-menu-sep{height:1px;margin:5px 4px;background:var(--border)}" +
    ".ct-mi{display:flex;align-items:center;gap:11px;width:100%;min-height:44px;padding:8px 10px;border:0;border-radius:10px;background:transparent;color:var(--text);font:600 14px 'DM Sans',sans-serif;text-align:left;cursor:pointer}.ct-mi:hover,.ct-mi:focus-visible{background:var(--surface2)}.ct-mi:disabled{opacity:.45;cursor:default}" +
    ".ct-mi.danger{color:#e5484d}.ct-mi-i{flex:0 0 22px;display:inline-flex;justify-content:center;align-items:center;font-size:15px}.ct-mi-t small{display:block;font-weight:400;font-size:12px;color:var(--muted);margin-top:1px}" +
    ".ct-jhead{margin:0 0 14px}.ct-jname{font-size:17px;font-weight:700;word-break:break-word}" +
    ".ct-sec,.ct-pd{border:1px solid var(--border);border-radius:14px;background:var(--surface2);margin:0 0 10px}.ct-pd{background:var(--surface);border-radius:12px;margin:0 0 7px}" +
    ".ct-sec>summary,.ct-pd>summary{display:flex;align-items:center;gap:10px;list-style:none;cursor:pointer;padding:13px 14px;min-height:44px;box-sizing:border-box;user-select:none}.ct-pd>summary{padding:10px 12px;min-height:42px}" +
    ".ct-sec>summary::-webkit-details-marker,.ct-pd>summary::-webkit-details-marker{display:none}.ct-sec>summary span{flex:1;font-weight:700;font-size:14px}.ct-pd>summary span{flex:1;font-weight:600;font-size:13.5px}" +
    ".ct-sec>summary em,.ct-pd>summary em{font-style:normal;font-size:12px;color:var(--muted)}.ct-pd>summary em{padding:2px 9px;border-radius:99px;border:1px solid var(--border);font-weight:600}.ct-pd>summary em.all{color:#3fb56f;border-color:rgba(63,181,111,.45)}.ct-pd>summary em.hosts{color:var(--accent);border-color:var(--accent)}" +
    ".ct-sec>summary i,.ct-pd>summary i{flex:0 0 8px;width:8px;height:8px;margin:0 3px 3px 2px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);transition:transform .15s}.ct-sec[open]>summary i,.ct-pd[open]>summary i{transform:rotate(-135deg);margin-bottom:-3px}" +
    ".ct-sec-b{padding:0 14px 14px}.ct-pd-b{padding:0 12px 12px}.ct-pds{margin:0}" +
    ".ct-seg{display:flex;border:1.5px solid var(--border);border-radius:12px;overflow:hidden}.ct-seg button{flex:1;min-height:40px;padding:0 8px;border:0;background:transparent;color:var(--muted);font:600 13px 'DM Sans',sans-serif;cursor:pointer}.ct-seg button+button{border-left:1.5px solid var(--border)}.ct-seg button.on{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#14110a}" +
    ".ct-mems{display:flex;flex-direction:column;gap:2px}.ct-mem{display:flex;align-items:center;gap:4px}" +
    ".ct-mem-main{flex:1;min-width:0;display:flex;align-items:center;gap:11px;padding:7px 8px;border-radius:12px;cursor:pointer}.ct-mem-main:hover{background:var(--surface)}" +
    ".ct-av{flex:0 0 40px;width:40px;height:40px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);font-weight:800;font-size:16px;color:var(--text)}.ct-av img{width:100%;height:100%;object-fit:cover}" +
    ".ct-mem-t{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0}.ct-mem-n{display:flex;align-items:center;gap:4px;min-width:0;max-width:100%}.ct-mem-n b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ct-bdg{display:inline-flex;align-items:center;flex:0 0 auto}" +
    ".ct-srow{display:flex;gap:8px;margin-top:5px}.ct-srow .ks-input{margin-top:0!important;flex:1;min-width:0}" +
    ".ct-res{display:flex;align-items:center;gap:11px;padding:8px 10px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.ct-res .ct-mem-t{flex:1}.ct-res-msg{font-size:13px;color:var(--muted);padding:4px 2px}" +
    ".ct-sub-h{margin:4px 0 8px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}" +
    ".ct-danger-zone{margin-top:18px;padding-top:12px;border-top:1px dashed rgba(229,72,77,.35);display:flex;align-items:center;gap:10px;flex-wrap:wrap}" +
    ".ct-danger{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 11px;border-radius:8px;border:1px solid rgba(229,72,77,.55);background:rgba(229,72,77,.1);color:#e5484d;font:700 12px 'DM Sans',sans-serif;cursor:pointer}.ct-danger:hover{background:rgba(229,72,77,.2)}" +
    ".ct-danger-solid{background:#e5484d!important;color:#fff!important;border-color:transparent!important}.ct-danger-solid:disabled{opacity:.4;cursor:not-allowed}" +
    ".ct-err{color:#e5484d;font-size:12.5px;margin:-4px 0 10px}.ct-err:empty{display:none}" +
    ".ct-pick{display:flex;flex-direction:column;gap:7px;max-height:46vh;overflow:auto}.ct-pk{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:9px 12px;border-radius:12px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text);font:inherit;text-align:left;cursor:pointer}.ct-pk.on{border-color:var(--accent)}.ct-pk:disabled{opacity:.5;cursor:not-allowed}" +
    ".ct-pk-box{flex:0 0 22px;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--muted);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#14110a}.ct-pk.on .ct-pk-box{background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent}" +
    ".ct-pk-t{display:flex;flex-direction:column;min-width:0}.ct-pk-t b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ct-pk-t small{color:var(--muted);font-size:12px}" +
    "@media (max-width:520px){.ct-act .btn{flex:1}.ct-uses{flex:1 1 100%;margin:2px 0 0}.ct-head>.btn{width:100%}.ct-tab-jam{max-width:170px}.ct-srow{flex-wrap:wrap}.ct-srow .btn{flex:1}.ct-jp{max-height:76vh}}";
  document.head.appendChild(s);
}

if (typeof APPS !== 'undefined' && !APPS.some(function (a) { return a.id === 'catalog'; })) {
  var ctApp = { id: 'catalog', icon: '📚', name: 'Catalog', desc: 'Your private library of reusable texts. Copy, share and sync across devices', render: renderCatalog };
  var dcAt = -1; APPS.forEach(function (a, n) { if (a.id === 'devicecheck') dcAt = n; });
  APPS.splice(dcAt + 1, 0, ctApp);
}
window.renderCatalog = renderCatalog;
})();
