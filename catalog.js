/* ════════════════════════════════════════════════════════════════════
   Alio — catalog.js
   1) Account sync for Notes & To-do (cross-device, offline-first)
   2) Catalog — your private library of saved texts (prompts, disclaimers…)

   Needs the small bridge in index.html that sets window.KSCore
   ({db, fs, onUser, user}). Firestore path used for everything:
       userSync/{uid}/items/{id}    (owner-only, see rules)
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
  if (meta.fresh && last && last !== u.uid && anyLocalData() && typeof window.ksAsk === 'function') {
    setStatus('wait');
    window.ksAsk('The notes, tasks and texts on this device were last synced with a different account. Add them to this account, or start fresh with only this account\'s data?', go, {
      title: 'Different account', okText: 'Add to this account', cancelText: 'Start fresh', danger: false,
      onNo: function () { wipeLocalAfterBackup(); go(); }
    });
  } else go();
}
function end() {
  stopListen(); clearTimeout(timer);
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

function okItem(i) { return i && typeof i === 'object' && typeof i.id === 'string' && RE_ID.test(i.id); }
function norm(i) {
  return {
    id: i.id, t: str(i.t, 100), b: str(i.b, 10000), c: str(i.c, 40),
    g: Array.isArray(i.g) ? i.g.filter(function (s) { return typeof s === 'string' && s.trim(); }).slice(0, 10).map(function (s) { return s.trim().slice(0, 30); }) : [],
    p: i.p ? 1 : 0, n: +i.n || 0, lu: +i.lu || 0, u: +i.u || 0, cr: +i.cr || 0
  };
}
function items() { return rda(KEYS.c).filter(okItem).map(norm); }
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
  var all = items(), it = id ? all.filter(function (x) { return x.id === id; })[0] : null;
  if (id && !it) return;
  if (!id && all.length >= MAX) { toast('Your Catalog is full (' + MAX + ' texts). Delete some first.', 'err'); return; }
  var cats = allCats(all), opts = cats.concat(DEF.filter(function (d) { return cats.map(function (c) { return c.toLowerCase(); }).indexOf(d.toLowerCase()) < 0; }));
  var node = document.createElement('div');
  node.innerHTML =
    "<label class='ct-lab'>Title<input class='ks-input' id='ctT' maxlength='100' placeholder='e.g. Data disclaimer' value='" + esc(it ? it.t : '') + "'></label>" +
    "<label class='ct-lab'>Category<input class='ks-input' id='ctC' maxlength='40' list='ctCL' placeholder='Pick or type a new one' value='" + esc(it ? it.c : (st.cat && st.cat[0] !== '@' ? st.cat : '')) + "'></label>" +
    "<datalist id='ctCL'>" + opts.map(function (c) { return "<option value='" + esc(c) + "'>"; }).join('') + "</datalist>" +
    "<label class='ct-lab'>Tags <span class='ct-hint'>comma separated, optional</span><input class='ks-input' id='ctG' maxlength='200' placeholder='client, legal, whatsapp' value='" + esc(it ? it.g.join(', ') : '') + "'></label>" +
    "<label class='ct-lab'>Text <span class='ct-hint' id='ctN'></span><textarea class='ks-input' id='ctB' rows='9' maxlength='10000' placeholder='Paste or write the text you reuse. Tip: use {{name}} for blanks you fill in when copying.'>" + esc(it ? it.b : '') + "</textarea></label>" +
    "<div class='ct-row'><button type='button' class='btn btn-primary' id='ctS'>Save</button>" +
    (it ? "<button type='button' class='btn btn-secondary' id='ctCp'>Copy</button><button type='button' class='btn btn-ghost ct-del' id='ctD'>Delete</button>" : "") + "</div>";
  var m = window.ksModal(it ? 'Edit text' : 'New text', node, { width: 540 });
  var T = node.querySelector('#ctT'), B = node.querySelector('#ctB'), N = node.querySelector('#ctN');
  function cnt() { N.textContent = B.value.length + ' / 10000'; }
  B.addEventListener('input', cnt); cnt();
  function collect() {
    var b = B.value.trim(), t = T.value.trim();
    if (!b) { toast('Add the text first.', 'err'); B.focus(); return null; }
    if (!t) t = b.split('\n')[0].slice(0, 60);
    var g = node.querySelector('#ctG').value.split(',').map(function (s) { return s.trim().slice(0, 30); }).filter(Boolean).slice(0, 10);
    var c = node.querySelector('#ctC').value.trim().slice(0, 40);
    var ex = allCats(items()).filter(function (x) { return x.toLowerCase() === c.toLowerCase(); })[0];
    return { t: t.slice(0, 100), b: b, c: ex || c, g: g };
  }
  node.querySelector('#ctS').onclick = function () {
    var v = collect(); if (!v) return;
    var a = items(), now = Date.now();
    if (it) a.forEach(function (x) { if (x.id === it.id) { x.t = v.t; x.b = v.b; x.c = v.c; x.g = v.g; x.u = now; } });
    else a.push({ id: uid(), t: v.t, b: v.b, c: v.c, g: v.g, p: 0, n: 0, lu: 0, u: now, cr: now });
    if (saveItems(a)) { m.close(); toast('Saved', 'ok'); paint(); }
  };
  if (it) {
    node.querySelector('#ctCp').onclick = function () { var v = collect(); if (v) doCopy({ id: it.id, b: v.b }); };
    node.querySelector('#ctD').onclick = function () {
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
window.ksCatPrev = function (text) { var m = msgInfo(text); return m ? '\uD83D\uDCDA Catalog text: ' + m.title : ''; };
window.ksCatCard = function (text) {
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
    "<button type='button' class='ct-sh' data-k='file'><span class='ct-sh-i'>📄</span><span><b>Share as text file</b><small>A .txt file you can send or save.</small></span></button>";
  var m = window.ksModal('Share', node, { width: 420 });
  node.onclick = function (e) {
    var b = e.target.closest ? e.target.closest('[data-k]') : null; if (!b) return;
    var k = b.getAttribute('data-k'); m.close();
    if (k === 'chat') shareChat(it); else if (k === 'text') shareText(it); else shareFile(it);
  };
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
  var a = items(), words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
  if (st.cat === '@pin') a = a.filter(function (i) { return i.p; });
  else if (st.cat === '@none') a = a.filter(function (i) { return !i.c; });
  else if (st.cat) a = a.filter(function (i) { return i.c === st.cat; });
  if (words.length) a.forEach(function (i) { i._s = score(i, words); });
  if (words.length) a = a.filter(function (i) { return i._s > 0; });
  a.sort(function (x, y) {
    if (words.length && x._s !== y._s) return y._s - x._s;
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
  var a = items(), cats = allCats(a), none = a.filter(function (i) { return !i.c; }).length, pins = a.filter(function (i) { return i.p; }).length;
  function chip(key, label, n) { return "<button type='button' class='ct-chip' data-cat='" + esc(key) + "' aria-pressed='" + (st.cat === key) + "'>" + label + (n != null ? " <i>" + n + "</i>" : "") + "</button>"; }
  var h = chip('', 'All', a.length);
  if (pins) h += chip('@pin', '★ Pinned', pins);
  cats.forEach(function (c) { h += chip(c, esc(c), a.filter(function (i) { return i.c === c; }).length); });
  if (none && cats.length) h += chip('@none', 'Uncategorised', none);
  if (editOn()) h += "<button type='button' class='ct-chip ct-add' data-a='addcat'>＋ Category</button>";
  if (cats.length && editOn()) h += "<button type='button' class='ct-chip ct-add' data-a='mancat' aria-label='Manage categories'>⚙</button>";
  el.innerHTML = h;
}
function paintList() {
  var el = document.getElementById('ctList'); if (!el) return;
  var all = items(), a = view();
  var cnt = document.getElementById('ctCount'); if (cnt) cnt.textContent = all.length + ' / ' + MAX;
  if (!all.length) {
    el.innerHTML = "<div class='ct-empty'><div class='ct-eico'>📚</div><b>Your Catalog is empty</b><p>Save the texts you keep re-typing or re-searching for: AI prompts, disclaimers, replies, work notes. Add one and it is a single tap to copy, on every device.</p>" + (editOn() ? "<button type='button' class='btn btn-primary' data-a='new'>＋ Add your first text</button>" : "") + "</div>";
    return;
  }
  if (!a.length) { el.innerHTML = "<div class='ct-empty'><b>Nothing found</b><p>Try different words or switch category.</p></div>"; return; }
  el.innerHTML = a.map(function (i) {
    var prev = i.b.replace(/\s+/g, ' ').slice(0, 170) + (i.b.length > 170 ? '…' : '');
    return "<article class='ct-card' data-id='" + esc(i.id) + "'>" +
      "<div class='ct-top'><h3>" + esc(i.t) + "</h3><div class='ct-tools'><button type='button' class='ct-ico' data-a='edit' aria-label='Edit' title='Edit'>" + PENCIL + "</button><button type='button' class='ct-pin' data-a='pin' aria-label='" + (i.p ? 'Unpin' : 'Pin') + "' aria-pressed='" + (i.p ? 'true' : 'false') + "'>" + (i.p ? '★' : '☆') + "</button></div></div>" +
      "<div class='ct-meta'>" + (i.c ? "<span class='ct-tag ct-cat'>" + esc(i.c) + "</span>" : '') + i.g.map(function (g) { return "<span class='ct-tag'>#" + esc(g) + "</span>"; }).join('') + "</div>" +
      "<p class='ct-prev'>" + esc(prev) + "</p>" +
      "<div class='ct-act'><button type='button' class='btn btn-primary' data-a='copy'>Copy</button><button type='button' class='btn btn-secondary' data-a='share'>Share</button><span class='ct-uses'>" + (i.n ? i.n + '× · ' : '') + fmtAgo(i.lu) + "</span></div></article>";
  }).join('');
}
function paintStatus() {
  var el = document.getElementById('ctSync'); if (!el) return;
  var s = status;
  el.textContent = s === 'paused' ? '☁️ Sync paused by the admin — saved on this device' : s === 'sync' ? '☁️ Syncing…' : s === 'off' ? '☁️ Offline — saved on this device, syncs later' : s === 'err' ? '☁️ Sync problem — will retry' : s === 'wait' ? '☁️ Waiting for your choice…' : '☁️ Synced to your account';
}
function paint() {
  var root = document.getElementById('ctBody'); if (!root) return;
  if (!user) {
    built = false;
    root.innerHTML = "<div class='ct-empty'><div class='ct-eico'>📚</div><b>Sign in to use your Catalog</b><p>Your Catalog is private to your account and syncs across your devices, so you need to be signed in.</p><button type='button' class='btn btn-primary' onclick=\"go('auth')\">Sign in</button></div>";
    return;
  }
  if (!built || !document.getElementById('ctList')) {
    root.innerHTML =
      "<div class='ct-head'><div><h2>📚 Catalog</h2><div class='ct-sub'>Your private library of texts to reuse · <span id='ctCount'></span></div><div class='ct-sync' id='ctSync'></div></div>" + (editOn() ? "<button type='button' class='btn btn-primary' data-a='new'>＋ New</button>" : "") + "</div>" +
      "<div class='ct-bar'><input type='search' class='ks-input' id='ctQ' placeholder='Search titles, text, tags…' maxlength='80' autocomplete='off' value='" + esc(st.q) + "'>" +
      "<select class='ks-input' id='ctSort' aria-label='Sort'><option value='used'>Recently used</option><option value='most'>Most used</option><option value='new'>Newest</option><option value='az'>A–Z</option></select></div>" +
      "<div class='ct-chips' id='ctChips'></div><div id='ctList' class='ct-list'></div>" +
      "" + (backupOn() ? "<div class='ct-foot'><button type='button' class='btn btn-ghost' data-a='export'>Export backup</button><button type='button' class='btn btn-ghost' data-a='import'>Import</button><input type='file' id='ctFile' accept='application/json,.json' hidden></div>" : "") +
      "<p class='ct-priv'>🔒 Only you can see your Catalog. It is not end-to-end encrypted, so don't store passwords or card numbers.</p>";
    built = true;
    var q = document.getElementById('ctQ'), so = document.getElementById('ctSort'), t;
    so.value = st.sort;
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = q.value; paintList(); }, 120); });
    so.addEventListener('change', function () { st.sort = so.value; paintList(); });
    var cf = document.getElementById('ctFile');
    if (cf) cf.addEventListener('change', function () { importFile(this.files[0]); this.value = ''; });
  }
  if (!root.__ct) { root.addEventListener('click', onClick); root.__ct = 1; }
  paintChips(); paintList(); paintStatus();
}
function onClick(e) {
  var b = e.target.closest ? e.target.closest('button,[data-cat],.ct-card') : null;
  if (!b) return;
  var cat = b.getAttribute('data-cat');
  if (cat != null) { st.cat = cat; paintChips(); paintList(); return; }
  var a = b.getAttribute('data-a'), card = b.closest('.ct-card'), id = card && card.getAttribute('data-id');
  if (a === 'new') return editOn() ? openEditor() : offMsg();
  if (a === 'addcat') return editOn() ? addCat() : offMsg();
  if (a === 'mancat') return editOn() ? manageCats() : offMsg();
  if (a === 'export') return backupOn() ? exportAll() : offMsg();
  if (a === 'import') { var cf2 = document.getElementById('ctFile'); return backupOn() && cf2 ? cf2.click() : offMsg(); }
  if (a === 'share' && id) { var sit = items().filter(function (x) { return x.id === id; })[0]; if (sit) openShare(sit); return; }
  if (a === 'copy' && id) { var it = items().filter(function (x) { return x.id === id; })[0]; if (it) doCopy(it); return; }
  if (a === 'pin' && id) {
    if (!editOn()) return offMsg();
    var all = items(); all.forEach(function (x) { if (x.id === id) { x.p = x.p ? 0 : 1; } });
    saveItems(all); paintChips(); paintList(); return;
  }
  if ((a === 'edit' || b.classList.contains('ct-card')) && id) { if (editOn()) openEditor(id); else if (a === 'edit') offMsg(); }
}
function ctRefresh() { if (document.getElementById('ctBody')) { built = built && !!user; paint(); } }
window.ctRefresh = ctRefresh;

function renderCatalog() {
  injectCss();
  st = { q: '', cat: '', sort: st.sort || 'used' }; built = false;
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
    "@media (max-width:520px){.ct-act .btn{flex:1}.ct-uses{flex:1 1 100%;margin:2px 0 0}}";
  document.head.appendChild(s);
}

if (typeof APPS !== 'undefined' && !APPS.some(function (a) { return a.id === 'catalog'; })) {
  var ctApp = { id: 'catalog', icon: '📚', name: 'Catalog', desc: 'Your private library of reusable texts. Copy, share and sync across devices', render: renderCatalog };
  var dcAt = -1; APPS.forEach(function (a, n) { if (a.id === 'devicecheck') dcAt = n; });
  APPS.splice(dcAt + 1, 0, ctApp);
}
window.renderCatalog = renderCatalog;
})();
