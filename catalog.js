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
      "<div class='ct-top'><h3>" + esc(i.t) + "</h3><button type='button' class='ct-pin' data-a='pin' aria-label='" + (i.p ? 'Unpin' : 'Pin') + "' aria-pressed='" + (i.p ? 'true' : 'false') + "'>" + (i.p ? '★' : '☆') + "</button></div>" +
      "<div class='ct-meta'>" + (i.c ? "<span class='ct-tag ct-cat'>" + esc(i.c) + "</span>" : '') + i.g.map(function (g) { return "<span class='ct-tag'>#" + esc(g) + "</span>"; }).join('') + "</div>" +
      "<p class='ct-prev'>" + esc(prev) + "</p>" +
      "<div class='ct-act'><button type='button' class='btn btn-primary' data-a='copy'>Copy</button><button type='button' class='btn btn-secondary' data-a='edit'>Edit</button><span class='ct-uses'>" + (i.n ? i.n + '× · ' : '') + fmtAgo(i.lu) + "</span></div></article>";
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
    ".ct-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.ct-top h3{margin:0;font-size:15.5px;line-height:1.3;color:var(--text);word-break:break-word}" +
    ".ct-pin{flex:0 0 auto;border:0;background:transparent;color:var(--accent);font-size:22px;line-height:1;min-width:36px;min-height:36px;cursor:pointer}" +
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
  APPS.push({ id: 'catalog', icon: '📚', name: 'Catalog', desc: 'Your private library of reusable texts — prompts, disclaimers, notes. Synced across devices', render: renderCatalog });
}
window.renderCatalog = renderCatalog;
})();
