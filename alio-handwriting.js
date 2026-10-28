/* alio-handwriting.js — Handwriting Maker.
   Loaded automatically by index.html the first time someone opens one of these pages (with the Alio loading screen).
   Keep this file in the same folder as index.html. */
/* ═══════════════════════════════════════════════════════════════
   HANDWRITING FONT CREATOR (added)
   Turn your own handwriting into a font you can type with.
   100% offline — no AI, no server, no uploads. Everything below
   is namespaced with the "hwfc" / "HWFC" prefix so it never
   collides with the rest of Alio.
   ═══════════════════════════════════════════════════════════════ */

/* ── 1. LANGUAGE PACKS ──
   Architecture supports adding more languages later: just add a new
   key here with uppercase/lowercase/optional arrays. English is the
   only pack shipped today; the rest of the app already tells users
   "More languages coming soon." */
const HWFC_LANGUAGES = {
  en: {
    name: 'English',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    lowercase: 'abcdefghijklmnopqrstuvwxyz'.split(''),
    optional: {
      numbers: '0123456789'.split(''),
      punctuation: ['.', ',', '!', '?', ':', ';', "'", '"', '(', ')', '[', ']', '{', '}', '-', '_', '/', '\\', '@', '#', '&', '*', '+', '='],
      math: ['+', '−', '×', '÷', '=', '%', '√', '^', '<', '>', '≤', '≥', '≈', '∞'],
      currency: ['₹', '$', '€', '£', '¥', '₩', '₽', '¢']
    }
  }
};
const HWFC_CATS = ['numbers', 'punctuation', 'math', 'currency'];
const HWFC_CAT_LABELS = { numbers: 'Numbers', punctuation: 'Punctuation', math: 'Mathematics', currency: 'Currency' };
const HWFC_CAT_ICONS = { numbers: '🔢', punctuation: '❗', math: '➗', currency: '💲' };

/* ── 2. DRAWING CANVAS GEOMETRY ──
   Every letter is captured on a fixed internal resolution square so
   that the baseline guide sits at the exact same relative spot for
   every single character. That fixed, shared geometry is what lets
   font-generation later work out a real baseline/scale for the font
   without any AI — it's just consistent geometry. */
const HWFC_CANVAS_SIZE = 480;
const HWFC_TOP_GUIDE_Y = Math.round(HWFC_CANVAS_SIZE * 0.14);
const HWFC_BASELINE_Y = Math.round(HWFC_CANVAS_SIZE * 0.72);
const HWFC_TARGET_CAP_UNITS = 64; /* font "design units" a capital letter is normalized to */
const HWFC_FONT_PX = { small: 0.40, medium: 0.56, large: 0.78 }; /* px per design-unit, by font-size setting */

/* ── 3. STATE ──
   hwfcState is the single source of truth for this feature. It is
   loaded from storage on first entry and re-saved (debounced) any
   time it changes. Shape:
   {
     view, lang, collectMode, collectIndex, optCatIdx, optCharIdx,
     glyphs: { [char]: { raw: dataURL, crop, scale/baseline metrics } },
     optionalStatus: { numbers:'pending'|'done'|'skipped', ... },
     settings: { fontSize, letterSpacing, wordSpacing, lineHeight, themeMode },
     typedText, fontGenerated
   } */
let hwfcState = null;
let hwfcUseIDB = false;
let hwfcDBHandle = null;
let hwfcDBReady = null; /* var (not let) — go() below can reference this before this line runs */
let hwfcStrokes = [];   /* strokes for the CURRENT letter being drawn */
let hwfcRedoStrokes = [];
let hwfcActivePointerId = null;
let hwfcCurrentStroke = null;
let hwfcTypingHistory = [];
let hwfcTypingHistoryIdx = -1; /* var (not let) — same reason as hwfcSaveTimer above */
let hwfcPreviewRAF = null;
let hwfcInkCtx = null;
let hwfcTouched = false;
let hwfcOptCharIdx = null;
let hwfcResizeHandlerRef = null;
let hwfcMeasureCanvasEl = null;
let hwfcRenderMultiplier = 1;

function hwfcDefaultState(){
  return {
    view: 'home',
    lang: 'en',
    collectMode: 'upper',
    collectIndex: 0,
    optCatIdx: 0,
    glyphs: {},
    optionalStatus: { numbers: 'pending', punctuation: 'pending', math: 'pending', currency: 'pending' },
    settings: { fontSize: 'medium', letterSpacing: 0, wordSpacing: 0, lineHeight: 1.4, themeMode: 'system' },
    typedText: '',
    fontGenerated: false
  };
}

/* ── 4. STORAGE — IndexedDB, falling back to localStorage ──
   IndexedDB is used because the captured handwriting (dozens of
   small transparent PNGs) can comfortably exceed what's safe to
   keep in localStorage. If IndexedDB isn't available for any reason
   the whole thing still works, just backed by localStorage instead. */
function hwfcDbOpen(){
  if (hwfcDBReady) return hwfcDBReady;
  hwfcDBReady = new Promise((resolve) => {
    if (!('indexedDB' in window)) { hwfcUseIDB = false; resolve(null); return; }
    try{
      const req = indexedDB.open('hwfcFontDB', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
      };
      req.onsuccess = () => { hwfcDBHandle = req.result; hwfcUseIDB = true; resolve(hwfcDBHandle); };
      req.onerror = () => { hwfcUseIDB = false; resolve(null); };
    }catch(e){ hwfcUseIDB = false; resolve(null); }
  });
  return hwfcDBReady;
}
function hwfcDbGet(key){
  return hwfcDbOpen().then((db) => {
    if (!db) {
      try{ const raw = localStorage.getItem('hwfc_' + key); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
    }
    return new Promise((resolve) => {
      try{
        const tx = db.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => resolve(null);
      }catch(e){ resolve(null); }
    });
  });
}
function hwfcDbSet(key, value){
  return hwfcDbOpen().then((db) => {
    if (!db) {
      try{ localStorage.setItem('hwfc_' + key, JSON.stringify(value)); }catch(e){ /* quota or unavailable — silently skip, non-fatal */ }
      return;
    }
    return new Promise((resolve) => {
      try{
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put({ key: key, value: value });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      }catch(e){ resolve(); }
    });
  });
}
function hwfcScheduleSave(){
  clearTimeout(hwfcSaveTimer);
  hwfcSaveTimer = setTimeout(() => {
    if (!hwfcState) return;
    hwfcDbSet('profile', hwfcState);
  }, 350);
}
function hwfcInit(cb){
  if (hwfcState){ cb(); return; }
  hwfcDbGet('profile').then((saved) => {
    hwfcState = saved && typeof saved === 'object' ? Object.assign(hwfcDefaultState(), saved) : hwfcDefaultState();
    /* merge nested objects properly instead of letting a partial saved shape wipe defaults */
    if (saved){
      hwfcState.optionalStatus = Object.assign({ numbers:'pending', punctuation:'pending', math:'pending', currency:'pending' }, saved.optionalStatus || {});
      hwfcState.settings = Object.assign({ fontSize:'medium', letterSpacing:0, wordSpacing:0, lineHeight:1.4, themeMode:'system' }, saved.settings || {});
      hwfcState.glyphs = saved.glyphs || {};
    }
    cb();
  });
}

/* ── 5. SMALL UTILITIES ── */
function hwfcEsc(s){
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function hwfcDebounce(fn, ms){
  let t = null;
  return function(...args){ clearTimeout(t); t = setTimeout(() => fn.apply(null, args), ms); };
}
function hwfcToast(msg){
  const el = document.createElement('div');
  el.className = 'hwfc-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2200);
}
function hwfcCharKey(ch){
  /* human-friendly label for punctuation/math/currency chars in headings */
  const names = { ' ':'space', '.':'period', ',':'comma', '!':'exclamation mark', '?':'question mark', ':':'colon', ';':'semicolon',
    "'":'apostrophe', '"':'quotation mark', '(':'open parenthesis', ')':'close parenthesis', '[':'open bracket', ']':'close bracket',
    '{':'open brace', '}':'close brace', '-':'hyphen', '_':'underscore', '/':'slash', '\\':'backslash', '@':'at sign', '#':'hash',
    '&':'ampersand', '*':'asterisk', '+':'plus', '=':'equals', '−':'minus', '×':'multiply', '÷':'divide', '%':'percent', '√':'square root',
    '^':'caret', '<':'less than', '>':'greater than', '≤':'less or equal', '≥':'greater or equal', '≈':'approximately', '∞':'infinity',
    '₹':'rupee', '$':'dollar', '€':'euro', '£':'pound', '¥':'yen', '₩':'won', '₽':'ruble', '¢':'cent' };
  return names[ch] || ch;
}
function hwfcDownloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ── 6. DRAWING ENGINE ──
   Two stacked canvases: a static "guide" layer (baseline + margin,
   purely visual, redrawn once) and a transparent "ink" layer the
   user actually draws on and which is the only one ever exported.
   Strokes are stored as arrays of {x,y,p} points in the ink canvas's
   own coordinate space so undo/redo can fully replay them. */
function hwfcPointFromEvent(e, canvasEl){
  const rect = canvasEl.getBoundingClientRect();
  const scaleX = canvasEl.width / rect.width;
  const scaleY = canvasEl.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, p: (e.pressure && e.pressure > 0) ? e.pressure : 0.5 };
}
function hwfcDrawGuides(ctx){
  ctx.save();
  ctx.strokeStyle = 'rgba(127,137,168,0.35)';
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, HWFC_BASELINE_Y); ctx.lineTo(HWFC_CANVAS_SIZE, HWFC_BASELINE_Y); ctx.stroke();
  ctx.strokeStyle = 'rgba(127,137,168,0.18)';
  ctx.beginPath(); ctx.moveTo(0, HWFC_TOP_GUIDE_Y); ctx.lineTo(HWFC_CANVAS_SIZE, HWFC_TOP_GUIDE_Y); ctx.stroke();
  ctx.restore();
}
function hwfcRedrawInk(ctx, strokes){
  ctx.clearRect(0, 0, HWFC_CANVAS_SIZE, HWFC_CANVAS_SIZE);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#111';
  strokes.forEach((stroke) => {
    if (stroke.length < 2){
      if (stroke.length === 1){ /* a tap/dot — draw a small filled circle */
        const p = stroke[0];
        ctx.beginPath(); ctx.fillStyle = ctx.strokeStyle;
        ctx.arc(p.x, p.y, Math.max(3, 7 * p.p), 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    for (let i = 1; i < stroke.length; i++){
      const p0 = stroke[i - 1], p1 = stroke[i];
      const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      ctx.lineWidth = Math.max(2.5, 11 * ((p0.p + p1.p) / 2));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p0.x, p0.y, mid.x, mid.y);
      ctx.stroke();
    }
  });
}
function hwfcSetupCanvas(guideEl, inkEl, onStrokeEnd){
  const gctx = guideEl.getContext('2d');
  const ictx = inkEl.getContext('2d');
  hwfcDrawGuides(gctx);
  hwfcStrokes = []; hwfcRedoStrokes = []; hwfcCurrentStroke = null; hwfcActivePointerId = null;
  hwfcRedrawInk(ictx, hwfcStrokes);

  function down(e){
    if (hwfcActivePointerId !== null) return;
    hwfcActivePointerId = e.pointerId;
    inkEl.setPointerCapture(e.pointerId);
    hwfcCurrentStroke = [hwfcPointFromEvent(e, inkEl)];
    hwfcRedoStrokes = [];
    e.preventDefault();
  }
  function move(e){
    if (e.pointerId !== hwfcActivePointerId || !hwfcCurrentStroke) return;
    hwfcCurrentStroke.push(hwfcPointFromEvent(e, inkEl));
    hwfcRedrawInk(ictx, hwfcStrokes.concat([hwfcCurrentStroke]));
    e.preventDefault();
  }
  function up(e){
    if (e.pointerId !== hwfcActivePointerId) return;
    if (hwfcCurrentStroke && hwfcCurrentStroke.length) hwfcStrokes.push(hwfcCurrentStroke);
    hwfcCurrentStroke = null;
    hwfcActivePointerId = null;
    hwfcRedrawInk(ictx, hwfcStrokes);
    if (typeof onStrokeEnd === 'function') onStrokeEnd();
  }
  inkEl.addEventListener('pointerdown', down);
  inkEl.addEventListener('pointermove', move);
  inkEl.addEventListener('pointerup', up);
  inkEl.addEventListener('pointercancel', up);
  inkEl.addEventListener('pointerleave', (e) => { if (e.pointerId === hwfcActivePointerId) up(e); });
  return ictx;
}
function hwfcUndoStroke(ictx){
  if (!hwfcStrokes.length) return;
  hwfcRedoStrokes.push(hwfcStrokes.pop());
  hwfcRedrawInk(ictx, hwfcStrokes);
}
function hwfcRedoStroke(ictx){
  if (!hwfcRedoStrokes.length) return;
  hwfcStrokes.push(hwfcRedoStrokes.pop());
  hwfcRedrawInk(ictx, hwfcStrokes);
}
function hwfcClearStrokes(ictx){
  hwfcStrokes = []; hwfcRedoStrokes = [];
  hwfcRedrawInk(ictx, hwfcStrokes);
}

/* ── 7. GLYPH SAVING ──
   Called when the user moves off a letter. Saves the ink canvas's
   current bitmap as this character's raw glyph (or removes it if
   the user left the letter blank). */
function hwfcSaveCurrentGlyph(ch, inkEl){
  /* Only touch stored state if the user actually interacted with this
     letter during this visit — otherwise simply paging through to look
     at Review would silently wipe out already-drawn letters. */
  if (!hwfcTouched) return;
  if (!hwfcStrokes.length){
    delete hwfcState.glyphs[ch];
  }else{
    hwfcState.glyphs[ch] = { raw: inkEl.toDataURL('image/png') };
  }
  hwfcScheduleSave();
}
/* Mounts the two-layer canvas for whichever character is currently being
   collected (required or optional). If a glyph was already saved for this
   character, its bitmap is shown as a starting preview — the instant the
   user begins a new stroke, the live stroke-redraw naturally replaces it. */
function hwfcMountCollectCanvas(ch){
  const guideEl = document.getElementById('hwfcGuide');
  const inkEl = document.getElementById('hwfcInk');
  hwfcInkCtx = hwfcSetupCanvas(guideEl, inkEl, () => { hwfcTouched = true; });
  hwfcTouched = false;
  const existing = hwfcState.glyphs[ch];
  if (existing && existing.raw){
    const img = new Image();
    img.onload = () => { if (!hwfcTouched && !hwfcStrokes.length && hwfcInkCtx) hwfcInkCtx.drawImage(img, 0, 0); };
    img.src = existing.raw;
  }
}
function hwfcTUndo(){ hwfcUndoStroke(hwfcInkCtx); hwfcTouched = true; }
function hwfcTRedo(){ hwfcRedoStroke(hwfcInkCtx); hwfcTouched = true; }
function hwfcTClear(){ hwfcClearStrokes(hwfcInkCtx); hwfcTouched = true; }

/* ── 8. FONT GENERATION ──
   No AI — pure image-processing math:
     1. Find each glyph's tight non-transparent bounding box (crop).
     2. Every glyph was drawn against the SAME fixed baseline guide,
        so (baselineY - cropTop) is a real, comparable "baseline
        offset" for that glyph.
     3. One global scale factor (based on the median cap-height of
        the 26 uppercase letters) is applied to every glyph so
        relative proportions between letters stay natural instead of
        each letter being independently stretched to match. */
function hwfcLoadImage(dataURL){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}
function hwfcCropBounds(img){
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
  for (let y = 0; y < c.height; y++){
    for (let x = 0; x < c.width; x++){
      const alpha = data[(y * c.width + x) * 4 + 3];
      if (alpha > 10){
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; /* fully blank */
  return { minX, minY, maxX, maxY, canvas: c };
}
function hwfcCroppedDataURL(bounds){
  const w = bounds.maxX - bounds.minX + 1, h = bounds.maxY - bounds.minY + 1;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d').drawImage(bounds.canvas, bounds.minX, bounds.minY, w, h, 0, 0, w, h);
  return out.toDataURL('image/png');
}
async function hwfcGenerateFont(onProgress){
  const chars = Object.keys(hwfcState.glyphs);
  const bounds = {};
  for (let i = 0; i < chars.length; i++){
    const ch = chars[i];
    const img = await hwfcLoadImage(hwfcState.glyphs[ch].raw);
    const b = hwfcCropBounds(img);
    if (b) bounds[ch] = b;
    if (typeof onProgress === 'function') onProgress(i + 1, chars.length);
  }
  /* median cap-height from whichever uppercase letters were actually drawn */
  const upperHeights = HWFC_LANGUAGES[hwfcState.lang].uppercase
    .filter((ch) => bounds[ch])
    .map((ch) => bounds[ch].maxY - bounds[ch].minY + 1)
    .sort((a, b) => a - b);
  const medianCap = upperHeights.length ? upperHeights[Math.floor(upperHeights.length / 2)] : 1;
  const globalScale = HWFC_TARGET_CAP_UNITS / Math.max(1, medianCap);

  Object.keys(bounds).forEach((ch) => {
    const b = bounds[ch];
    const cropW = b.maxX - b.minX + 1, cropH = b.maxY - b.minY + 1;
    const baselineFromTop = HWFC_BASELINE_Y - b.minY;
    hwfcState.glyphs[ch].processed = {
      img: hwfcCroppedDataURL(b),
      w: cropW * globalScale,
      h: cropH * globalScale,
      baseline: baselineFromTop * globalScale
    };
  });
  hwfcState.fontGenerated = true;
  await hwfcDbSet('profile', hwfcState);
}

/* ── 9. TEXT LAYOUT + RENDER ENGINE ──
   Shared by the live preview canvas and the hi-res PNG export, so
   what you see is exactly what gets downloaded. Missing characters
   fall back to a plain system font at a matching size instead of a
   blank box. */
function hwfcUnitPx(){ return HWFC_FONT_PX[hwfcState.settings.fontSize] || HWFC_FONT_PX.medium; }
function hwfcGlyphAdvance(ch, unitPx, fallbackCtx){
  const g = hwfcState.glyphs[ch] && hwfcState.glyphs[ch].processed;
  const letterSpacing = hwfcState.settings.letterSpacing || 0;
  if (g) return g.w * unitPx + letterSpacing;
  if (ch === ' ') return HWFC_TARGET_CAP_UNITS * 0.5 * unitPx + (hwfcState.settings.wordSpacing || 0) + letterSpacing;
  fallbackCtx.font = Math.round(HWFC_TARGET_CAP_UNITS * unitPx) + 'px system-ui, sans-serif';
  return fallbackCtx.measureText(ch).width + letterSpacing;
}
function hwfcLayoutText(text, maxWidth, measureCtx){
  const unitPx = hwfcUnitPx();
  const paragraphs = text.split('\n');
  const lines = []; /* each: { chars:[{ch,x}], width } */
  paragraphs.forEach((para) => {
    const words = para.length ? para.split(' ') : [''];
    let line = { chars: [], width: 0 };
    words.forEach((word, wi) => {
      const wordChars = wi < words.length - 1 ? word + ' ' : word;
      let wordWidth = 0;
      const advances = [];
      for (const ch of wordChars){
        const adv = hwfcGlyphAdvance(ch, unitPx, measureCtx);
        advances.push(adv); wordWidth += adv;
      }
      if (line.width + wordWidth > maxWidth && line.chars.length){
        lines.push(line);
        line = { chars: [], width: 0 };
      }
      let cursor = line.width;
      let ci = 0;
      for (const ch of wordChars){
        if (cursor + advances[ci] > maxWidth && line.chars.length){
          lines.push(line);
          line = { chars: [], width: 0 };
          cursor = 0;
        }
        line.chars.push({ ch, x: cursor, adv: advances[ci] });
        cursor += advances[ci]; ci++;
      }
      line.width = cursor;
    });
    lines.push(line);
  });
  return lines;
}
function hwfcPreloadGlyphImages(){
  const jobs = [];
  Object.keys(hwfcState.glyphs).forEach((ch) => {
    const g = hwfcState.glyphs[ch].processed;
    if (g && g.img && !g._imgEl){
      const img = new Image();
      jobs.push(new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; img.src = g.img; }));
      g._imgEl = img;
    }
  });
  return Promise.all(jobs);
}
function hwfcRenderLinesToCanvas(canvasEl, lines, opts){
  const unitPx = hwfcUnitPx();
  const ctx = canvasEl.getContext('2d');
  const linePitch = HWFC_TARGET_CAP_UNITS * unitPx * (hwfcState.settings.lineHeight || 1.4);
  const topPad = linePitch * 0.9;
  canvasEl.width = opts.width;
  canvasEl.height = Math.max(opts.minHeight || 0, topPad + lines.length * linePitch + linePitch * 0.5);
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = opts.ink || '#1a1a2e';
  lines.forEach((line, li) => {
    const baseY = topPad + li * linePitch;
    line.chars.forEach((c) => {
      const g = hwfcState.glyphs[c.ch] && hwfcState.glyphs[c.ch].processed;
      if (g && g.img && g._imgEl && g._imgEl.complete && g._imgEl.naturalWidth){
        const dw = g.w * unitPx, dh = g.h * unitPx;
        try{ ctx.drawImage(g._imgEl, c.x, baseY - g.baseline * unitPx, dw, dh); }catch(e){}
      }else if (c.ch !== ' '){
        ctx.font = Math.round(HWFC_TARGET_CAP_UNITS * unitPx) + 'px system-ui, sans-serif';
        ctx.fillText(c.ch, c.x, baseY);
      }
    });
  });
  return canvasEl.height;
}

/* ── 10. LANGUAGE / PROGRESS HELPERS ── */
function hwfcLangData(){ return HWFC_LANGUAGES[hwfcState.lang] || HWFC_LANGUAGES.en; }
function hwfcRequiredList(mode){ return mode === 'upper' ? hwfcLangData().uppercase : hwfcLangData().lowercase; }
function hwfcRequiredDoneCount(){
  const all = hwfcLangData().uppercase.concat(hwfcLangData().lowercase);
  return all.filter((ch) => hwfcState.glyphs[ch]).length;
}
function hwfcCatChars(cat){ return hwfcLangData().optional[cat]; }
function hwfcCatPending(cat){ return hwfcCatChars(cat).filter((ch) => !hwfcState.glyphs[ch]); }
function hwfcCatStatusLabel(cat){
  const status = hwfcState.optionalStatus[cat];
  const total = hwfcCatChars(cat).length;
  const pendingCount = hwfcCatPending(cat).length;
  if (pendingCount === 0) return 'Completed';
  if (status === 'skipped') return 'Skipped';
  if (pendingCount < total) return `Partly done (${total - pendingCount}/${total})`;
  return 'Not started';
}

/* ── 11. CONFIRM MODAL (reuses the site's existing .modal-overlay look) ── */
function hwfcOpenConfirmModal(title, body, actionLabel, onConfirm){
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay';
  wrap.innerHTML = `<div class='modal-box'>
    <h3>${hwfcEsc(title)}</h3>
    <p>${hwfcEsc(body)}</p>
    <button class='btn btn-primary' style='width:100%;margin-top:6px' id='hwfcModalConfirmBtn'>${hwfcEsc(actionLabel)}</button>
    <button class='btn btn-secondary' style='width:100%;margin-top:10px' onclick="this.closest('.modal-overlay').remove()">Cancel</button>
  </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#hwfcModalConfirmBtn').onclick = () => { wrap.remove(); onConfirm(); };
}

/* ── 12. TOP-LEVEL ROUTER FOR THIS FEATURE ── */
function renderHandwritingFont(){
  appEl.innerHTML = "<div class='page-wrap'><p style='text-align:center;color:var(--muted);padding:60px 0'>Loading your handwriting…</p></div>";
  hwfcInit(() => { hwfcApplyThemeMode(); hwfcRenderCurrentView(); });
}
function hwfcRenderCurrentView(){
  if (curPage !== 'handwritingfont' || !hwfcState) return; /* guard against a stale async callback firing after the user navigated away */
  const v = hwfcState.view;
  if (v === 'collect') hwfcRenderCollect();
  else if (v === 'optional') hwfcRenderOptional();
  else if (v === 'review') hwfcRenderReview();
  else if (v === 'typing') hwfcRenderTyping();
  else hwfcRenderHome();
}
function hwfcSetView(view, extra){
  hwfcState.view = view;
  if (extra) Object.assign(hwfcState, extra);
  hwfcOptCharIdx = null;
  hwfcScheduleSave();
  hwfcRenderCurrentView();
}
function hwfcApplyThemeMode(){
  const mode = (hwfcState.settings || {}).themeMode || 'system';
  let effective = mode;
  if (mode === 'system') effective = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', effective);
}

/* ── 13. HOME / LANGUAGE VIEW ── */
function hwfcRenderHome(){
  const doneCount = hwfcRequiredDoneCount();
  const hasProgress = doneCount > 0 || Object.keys(hwfcState.glyphs).length > 0;
  appEl.innerHTML = `<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('fun')">← Back</button></div>
    <div class='page-header'>
      <div>
        <div class='section-label'>✍️ Handwriting Maker</div>
        <h2>Turn your handwriting into a typing font</h2>
      </div>
    </div>
    <div class='hwfc-card'>
      <label class='hwfc-label' for='hwfcLangSelect'>Language</label>
      <select id='hwfcLangSelect' class='ks-input' onchange='hwfcState.lang=this.value;hwfcScheduleSave()'>
        <option value='en' selected>English</option>
      </select>
      <p class='hwfc-hint'>More languages coming soon.</p>
      ${hasProgress ? `<div class='hwfc-progress-note'>You have handwriting saved — ${doneCount}/52 required letters done${hwfcState.fontGenerated ? ', and your font is ready.' : '.'}</div>` : ''}
      <button class='btn btn-primary' style='width:100%;margin-top:18px' onclick='hwfcHomeContinue()'>${hwfcState.fontGenerated ? 'Continue' : (hasProgress ? 'Resume' : 'Get Started')}</button>
      ${hwfcState.fontGenerated ? `<button class='btn btn-secondary' style='width:100%;margin-top:10px' onclick="hwfcSetView('typing')">Go straight to typing</button>` : ''}
      ${hasProgress ? `<button class='btn btn-secondary' style='width:100%;margin-top:10px' onclick='hwfcConfirmResetAll()'>Start a brand new font</button>` : ''}
    </div>
    <p class='hwfc-privacy'>🔒 Everything stays on your device. Nothing is uploaded, ever.</p>
  </div>`;
}
function hwfcHomeContinue(){
  if (hwfcState.fontGenerated){ hwfcSetView('typing'); return; }
  const upper = hwfcLangData().uppercase, lower = hwfcLangData().lowercase;
  const missingUpperIdx = upper.findIndex((ch) => !hwfcState.glyphs[ch]);
  if (missingUpperIdx !== -1){ hwfcSetView('collect', { collectMode: 'upper', collectIndex: missingUpperIdx }); return; }
  const missingLowerIdx = lower.findIndex((ch) => !hwfcState.glyphs[ch]);
  if (missingLowerIdx !== -1){ hwfcSetView('collect', { collectMode: 'lower', collectIndex: missingLowerIdx }); return; }
  const catIdx = HWFC_CATS.findIndex((cat) => hwfcState.optionalStatus[cat] === 'pending' && hwfcCatPending(cat).length > 0);
  if (catIdx !== -1){ hwfcSetView('optional', { optCatIdx: catIdx }); return; }
  hwfcSetView('review');
}
function hwfcConfirmResetAll(){
  hwfcOpenConfirmModal('Start a brand new font?', "This will erase every letter you've drawn and any font you've generated. This can't be undone.", 'Erase & start over', () => {
    hwfcState = hwfcDefaultState();
    hwfcDbSet('profile', hwfcState);
    hwfcRenderCurrentView();
    hwfcToast('Starting fresh.');
  });
}

/* ── 14. REQUIRED LETTER COLLECTION (A–Z, then a–z) ── */
function hwfcRenderCollect(){
  const list = hwfcRequiredList(hwfcState.collectMode);
  const ch = list[hwfcState.collectIndex];
  const globalIdx = hwfcState.collectMode === 'upper' ? hwfcState.collectIndex : 26 + hwfcState.collectIndex;
  const pct = Math.round((globalIdx / 52) * 100);
  appEl.innerHTML = `<div class='page-wrap hwfc-collect'>
    <div class='back-row'>
      <button class='back-btn' onclick='hwfcCollectPrev()'>← Back</button>
      <button class='back-btn' style='margin-left:auto' onclick='hwfcExitCollect()'>Exit ✕</button>
    </div>
    <div class='hwfc-progressbar' role='progressbar' aria-valuenow='${globalIdx + 1}' aria-valuemin='0' aria-valuemax='52'><div class='hwfc-progressbar-fill' style='width:${pct}%'></div></div>
    <p class='hwfc-counter'>${globalIdx + 1} / 52 &nbsp;·&nbsp; ${hwfcState.collectMode === 'upper' ? 'Uppercase letters' : 'Lowercase letters'}</p>
    <h2 class='hwfc-big-letter' aria-hidden='true'>${hwfcEsc(ch)}</h2>
    <div class='hwfc-canvas-wrap'>
      <canvas id='hwfcGuide' width='${HWFC_CANVAS_SIZE}' height='${HWFC_CANVAS_SIZE}' class='hwfc-canvas hwfc-canvas-guide' aria-hidden='true'></canvas>
      <canvas id='hwfcInk' width='${HWFC_CANVAS_SIZE}' height='${HWFC_CANVAS_SIZE}' class='hwfc-canvas hwfc-canvas-ink' tabindex='0' role='img' aria-label='Drawing canvas for the letter ${hwfcEsc(ch)}. Draw with your finger, stylus, or mouse.'></canvas>
    </div>
    <div class='hwfc-tools'>
      <button class='hwfc-tool-btn' onclick='hwfcTUndo()' aria-label='Undo last stroke'>↶ Undo</button>
      <button class='hwfc-tool-btn' onclick='hwfcTRedo()' aria-label='Redo stroke'>↷ Redo</button>
      <button class='hwfc-tool-btn' onclick='hwfcTClear()' aria-label='Clear this letter'>🗑 Clear</button>
    </div>
    <div class='hwfc-nav-row'>
      <button class='btn btn-secondary' onclick='hwfcCollectPrev()'>Previous</button>
      <button class='btn btn-primary' onclick='hwfcCollectNext()'>${globalIdx === 51 ? 'Continue →' : 'Next →'}</button>
    </div>
  </div>`;
  hwfcMountCollectCanvas(ch);
}
function hwfcCollectNext(){
  const ch = hwfcRequiredList(hwfcState.collectMode)[hwfcState.collectIndex];
  hwfcSaveCurrentGlyph(ch, document.getElementById('hwfcInk'));
  if (hwfcState.collectMode === 'upper' && hwfcState.collectIndex === 25){
    hwfcToast('Nice! Now the lowercase letters a–z.');
    hwfcSetView('collect', { collectMode: 'lower', collectIndex: 0 });
    return;
  }
  if (hwfcState.collectMode === 'lower' && hwfcState.collectIndex === 25){
    hwfcSetView('optional', { optCatIdx: 0 });
    return;
  }
  hwfcSetView('collect', { collectIndex: hwfcState.collectIndex + 1 });
}
function hwfcCollectPrev(){
  const ch = hwfcRequiredList(hwfcState.collectMode)[hwfcState.collectIndex];
  hwfcSaveCurrentGlyph(ch, document.getElementById('hwfcInk'));
  if (hwfcState.collectIndex > 0){ hwfcSetView('collect', { collectIndex: hwfcState.collectIndex - 1 }); return; }
  if (hwfcState.collectMode === 'lower'){ hwfcSetView('collect', { collectMode: 'upper', collectIndex: 25 }); return; }
  hwfcSetView('home');
}
function hwfcExitCollect(){
  if (hwfcState.view === 'optional'){
    const cat = HWFC_CATS[hwfcState.optCatIdx];
    const ch = cat ? hwfcCatPending(cat)[hwfcOptCharIdx] : null;
    if (ch) hwfcSaveCurrentGlyph(ch, document.getElementById('hwfcInk'));
  }else{
    const ch = hwfcRequiredList(hwfcState.collectMode)[hwfcState.collectIndex];
    hwfcSaveCurrentGlyph(ch, document.getElementById('hwfcInk'));
  }
  hwfcSetView('home');
}

/* ── 15. OPTIONAL CHARACTERS (Numbers / Punctuation / Math / Currency) ── */
function hwfcRenderOptional(){
  const cat = HWFC_CATS[hwfcState.optCatIdx];
  if (!cat){ hwfcSetView('review'); return; }
  const pending = hwfcCatPending(cat);
  if (hwfcOptCharIdx === null || hwfcOptCharIdx === undefined || hwfcOptCharIdx >= pending.length){
    hwfcRenderOptionalIntro(cat, pending);
  }else{
    hwfcRenderOptionalChar(cat, pending);
  }
}
function hwfcRenderOptionalIntro(cat, pending){
  appEl.innerHTML = `<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick='hwfcOptionalBack()'>← Back</button></div>
    <div class='page-header'><div><div class='section-label'>${HWFC_CAT_ICONS[cat]} Optional</div><h2>${HWFC_CAT_LABELS[cat]}</h2></div></div>
    <div class='hwfc-card'>
      <p>These characters are optional. If you skip them, they'll appear in your default system font whenever you type. You can always add them later from Review.</p>
      <p class='hwfc-hint'>${pending.length} of ${hwfcCatChars(cat).length} left to draw${pending.length === 0 ? ' — all done!' : ''}</p>
      <div class='hwfc-chip-row'>${hwfcCatChars(cat).map((ch) => `<span class='hwfc-chip ${hwfcState.glyphs[ch] ? 'done' : ''}' title='${hwfcEsc(hwfcCharKey(ch))}'>${hwfcEsc(ch)}</span>`).join('')}</div>
      ${pending.length > 0 ? `<button class='btn btn-primary' style='width:100%;margin-top:16px' onclick='hwfcOptCharIdx=0;hwfcRenderCurrentView()'>Draw ${HWFC_CAT_LABELS[cat]}</button>` : ''}
      <button class='btn btn-secondary' style='width:100%;margin-top:10px' onclick='hwfcSkipCategory()'>${pending.length > 0 ? 'Skip this category' : 'Continue'}</button>
    </div>
  </div>`;
}
function hwfcRenderOptionalChar(cat, pending){
  const ch = pending[hwfcOptCharIdx];
  const totalChars = hwfcCatChars(cat).length;
  const pct = Math.round(((totalChars - pending.length + hwfcOptCharIdx) / totalChars) * 100);
  appEl.innerHTML = `<div class='page-wrap hwfc-collect'>
    <div class='back-row'>
      <button class='back-btn' onclick='hwfcOptCharPrev()'>← Back</button>
      <button class='back-btn' style='margin-left:auto' onclick='hwfcExitCollect()'>Exit ✕</button>
    </div>
    <div class='hwfc-progressbar'><div class='hwfc-progressbar-fill' style='width:${pct}%'></div></div>
    <p class='hwfc-counter'>${HWFC_CAT_LABELS[cat]} &nbsp;·&nbsp; ${hwfcOptCharIdx + 1} / ${pending.length} left</p>
    <h2 class='hwfc-big-letter' aria-hidden='true'>${hwfcEsc(ch)}</h2>
    <p class='hwfc-hint' style='text-align:center'>${hwfcEsc(hwfcCharKey(ch))}</p>
    <div class='hwfc-canvas-wrap'>
      <canvas id='hwfcGuide' width='${HWFC_CANVAS_SIZE}' height='${HWFC_CANVAS_SIZE}' class='hwfc-canvas hwfc-canvas-guide' aria-hidden='true'></canvas>
      <canvas id='hwfcInk' width='${HWFC_CANVAS_SIZE}' height='${HWFC_CANVAS_SIZE}' class='hwfc-canvas hwfc-canvas-ink' tabindex='0' role='img' aria-label='Drawing canvas for ${hwfcEsc(hwfcCharKey(ch))}'></canvas>
    </div>
    <div class='hwfc-tools'>
      <button class='hwfc-tool-btn' onclick='hwfcTUndo()'>↶ Undo</button>
      <button class='hwfc-tool-btn' onclick='hwfcTRedo()'>↷ Redo</button>
      <button class='hwfc-tool-btn' onclick='hwfcTClear()'>🗑 Clear</button>
    </div>
    <div class='hwfc-nav-row'>
      <button class='btn btn-secondary' onclick='hwfcOptCharSkip()'>Skip this one</button>
      <button class='btn btn-primary' onclick='hwfcOptCharNext()'>${hwfcOptCharIdx === pending.length - 1 ? 'Done →' : 'Next →'}</button>
    </div>
  </div>`;
  hwfcMountCollectCanvas(ch);
}
function hwfcOptCharPrev(){
  const cat = HWFC_CATS[hwfcState.optCatIdx];
  const pending = hwfcCatPending(cat);
  const ch = pending[hwfcOptCharIdx];
  hwfcSaveCurrentGlyph(ch, document.getElementById('hwfcInk'));
  if (hwfcOptCharIdx > 0) hwfcOptCharIdx--; else hwfcOptCharIdx = null;
  hwfcRenderCurrentView();
}
function hwfcOptCharNext(){
  const cat = HWFC_CATS[hwfcState.optCatIdx];
  const pending = hwfcCatPending(cat);
  const ch = pending[hwfcOptCharIdx];
  hwfcSaveCurrentGlyph(ch, document.getElementById('hwfcInk'));
  const newPending = hwfcCatPending(cat);
  if (newPending.length === 0){
    hwfcState.optionalStatus[cat] = 'done'; hwfcScheduleSave();
    hwfcOptCharIdx = null; hwfcState.optCatIdx++;
    hwfcRenderCurrentView(); return;
  }
  const stillPending = newPending.indexOf(ch) !== -1;
  hwfcOptCharIdx = stillPending ? Math.min(hwfcOptCharIdx + 1, newPending.length - 1) : Math.min(hwfcOptCharIdx, newPending.length - 1);
  hwfcRenderCurrentView();
}
function hwfcOptCharSkip(){
  const cat = HWFC_CATS[hwfcState.optCatIdx];
  const pending = hwfcCatPending(cat);
  if (hwfcOptCharIdx < pending.length - 1){ hwfcOptCharIdx++; }
  else { hwfcOptCharIdx = null; hwfcState.optCatIdx++; }
  hwfcRenderCurrentView();
}
function hwfcSkipCategory(){
  const cat = HWFC_CATS[hwfcState.optCatIdx];
  hwfcState.optionalStatus[cat] = hwfcCatPending(cat).length > 0 ? 'skipped' : 'done';
  hwfcScheduleSave();
  hwfcOptCharIdx = null;
  hwfcState.optCatIdx++;
  hwfcRenderCurrentView();
}
function hwfcOptionalBack(){
  if (hwfcOptCharIdx !== null && hwfcOptCharIdx !== undefined){ hwfcOptCharIdx = null; hwfcRenderCurrentView(); return; }
  if (hwfcState.optCatIdx > 0){ hwfcState.optCatIdx--; hwfcRenderCurrentView(); return; }
  hwfcSetView('collect', { collectMode: 'lower', collectIndex: 25 });
}

/* ── 16. REVIEW ── */
function hwfcRenderReview(){
  const upperDone = hwfcLangData().uppercase.filter((ch) => hwfcState.glyphs[ch]).length;
  const lowerDone = hwfcLangData().lowercase.filter((ch) => hwfcState.glyphs[ch]).length;
  const allRequiredDone = upperDone === 26 && lowerDone === 26;
  appEl.innerHTML = `<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="hwfcSetView('optional',{optCatIdx:HWFC_CATS.length-1})">← Back</button></div>
    <div class='page-header'><div><div class='section-label'>✅ Review</div><h2>Review your handwriting</h2></div></div>
    <div class='hwfc-review-list'>
      <div class='hwfc-review-row'><span>Uppercase (A–Z)</span><span class='hwfc-status ${upperDone === 26 ? 'ok' : 'warn'}'>${upperDone === 26 ? 'Completed' : upperDone + '/26'}</span></div>
      <div class='hwfc-review-row'><span>Lowercase (a–z)</span><span class='hwfc-status ${lowerDone === 26 ? 'ok' : 'warn'}'>${lowerDone === 26 ? 'Completed' : lowerDone + '/26'}</span></div>
      ${HWFC_CATS.map((cat) => {
        const label = hwfcCatStatusLabel(cat);
        const ok = label === 'Completed' || label === 'Skipped';
        return `<div class='hwfc-review-row'><span>${HWFC_CAT_ICONS[cat]} ${HWFC_CAT_LABELS[cat]}</span><span class='hwfc-status ${ok ? 'ok' : 'warn'}'>${label}</span></div>`;
      }).join('')}
    </div>
    ${!allRequiredDone ? `<p class='hwfc-hint'>⚠️ Finish drawing every uppercase and lowercase letter before generating your font.</p>
      <button class='btn btn-secondary' style='width:100%;margin-top:6px' onclick='hwfcHomeContinue()'>Finish remaining letters</button>` : ''}
    <p id='hwfcGenProgress' class='hwfc-hint' style='display:none'></p>
    <button class='btn btn-primary' id='hwfcGenBtn' style='width:100%;margin-top:16px' ${!allRequiredDone ? 'disabled' : ''} onclick='hwfcRunGenerateFont()'>${hwfcState.fontGenerated ? 'Regenerate Font' : 'Generate Font'}</button>
    ${hwfcState.fontGenerated ? `<button class='btn btn-secondary' style='width:100%;margin-top:10px' onclick="hwfcSetView('typing')">Go to Typing →</button>` : ''}
  </div>`;
}
async function hwfcRunGenerateFont(){
  const btn = document.getElementById('hwfcGenBtn');
  const progress = document.getElementById('hwfcGenProgress');
  if (btn) btn.disabled = true;
  if (progress) progress.style.display = 'block';
  await hwfcGenerateFont((done, total) => { if (progress) progress.textContent = `Processing letters… ${done}/${total}`; });
  await hwfcPreloadGlyphImages();
  hwfcToast('Your font is ready!');
  hwfcSetView('typing');
}

/* ── 17. TYPING PAGE ── */
function hwfcRenderTyping(){
  appEl.innerHTML = `<div class='page-wrap hwfc-typing-page'>
    <div class='back-row'>
      <button class='back-btn' onclick="go('fun')">← Back</button>
      <button class='back-btn' style='margin-left:auto' onclick='hwfcOpenSettingsPanel()'>⚙ Display Settings</button>
    </div>
    <div class='page-header'><div><div class='section-label'>⌨️ Typing</div><h2>Type — see it in your handwriting</h2></div></div>
    <textarea id='hwfcTypeArea' class='hwfc-textarea' placeholder='Start typing here…' aria-label='Type your text, it will render in your handwriting below'>${hwfcEsc(hwfcState.typedText || '')}</textarea>
    <div class='hwfc-typing-toolbar'>
      <button class='hwfc-tool-btn' onclick='hwfcTextareaUndo()' aria-label='Undo typing'>↶ Undo</button>
      <button class='hwfc-tool-btn' onclick='hwfcTextareaRedo()' aria-label='Redo typing'>↷ Redo</button>
      <button class='hwfc-tool-btn' onclick='hwfcCopyText()' aria-label='Copy text'>📋 Copy</button>
      <button class='hwfc-tool-btn' onclick='hwfcDownloadPng()' aria-label='Download as PNG'>⬇️ Download PNG</button>
      <button class='hwfc-tool-btn' onclick='hwfcResetTyping()' aria-label='Clear typed text'>🧹 Reset</button>
    </div>
    <div class='hwfc-preview-wrap'><canvas id='hwfcPreviewCanvas' class='hwfc-preview-canvas' role='img' aria-label='Live preview of your text in your handwriting'></canvas></div>
    <button class='btn btn-secondary' style='width:100%;margin-top:18px' onclick='hwfcConfirmNewFont()'>Create New Font</button>
  </div>`;

  const ta = document.getElementById('hwfcTypeArea');
  hwfcTypingHistory = [ta.value]; hwfcTypingHistoryIdx = 0;
  hwfcPreloadGlyphImages().then(() => hwfcRefreshPreview());
  ta.addEventListener('input', () => {
    hwfcState.typedText = ta.value;
    hwfcScheduleSave();
    hwfcRefreshPreview();
    clearTimeout(hwfcTypingHistoryTimer);
    hwfcTypingHistoryTimer = setTimeout(() => {
      if (hwfcTypingHistory[hwfcTypingHistoryIdx] !== ta.value){
        hwfcTypingHistory = hwfcTypingHistory.slice(0, hwfcTypingHistoryIdx + 1);
        hwfcTypingHistory.push(ta.value);
        hwfcTypingHistoryIdx = hwfcTypingHistory.length - 1;
      }
    }, 500);
  });
  if (hwfcResizeHandlerRef) window.removeEventListener('resize', hwfcResizeHandlerRef);
  hwfcResizeHandlerRef = hwfcDebounce(() => { if (curPage === 'handwritingfont' && hwfcState && hwfcState.view === 'typing') hwfcRefreshPreview(); }, 200);
  window.addEventListener('resize', hwfcResizeHandlerRef);
}
function hwfcRefreshPreview(){
  const canvasEl = document.getElementById('hwfcPreviewCanvas');
  if (!canvasEl || !hwfcState) return;
  const wrap = canvasEl.parentElement;
  const cssWidth = Math.max(280, wrap.clientWidth - 4);
  if (!hwfcMeasureCanvasEl) hwfcMeasureCanvasEl = document.createElement('canvas');
  const lines = hwfcLayoutText(hwfcState.typedText || '', cssWidth, hwfcMeasureCanvasEl.getContext('2d'));
  const inkColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1a1a2e';
  hwfcRenderLinesToCanvas(canvasEl, lines, { width: cssWidth, ink: inkColor, minHeight: 160 });
}
function hwfcTextareaUndo(){
  if (hwfcTypingHistoryIdx <= 0) return;
  hwfcTypingHistoryIdx--;
  const ta = document.getElementById('hwfcTypeArea');
  ta.value = hwfcTypingHistory[hwfcTypingHistoryIdx];
  hwfcState.typedText = ta.value; hwfcScheduleSave(); hwfcRefreshPreview();
}
function hwfcTextareaRedo(){
  if (hwfcTypingHistoryIdx >= hwfcTypingHistory.length - 1) return;
  hwfcTypingHistoryIdx++;
  const ta = document.getElementById('hwfcTypeArea');
  ta.value = hwfcTypingHistory[hwfcTypingHistoryIdx];
  hwfcState.typedText = ta.value; hwfcScheduleSave(); hwfcRefreshPreview();
}
function hwfcCopyText(){
  const text = hwfcState.typedText || '';
  const done = () => hwfcToast('Copied as plain text.');
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(() => hwfcFallbackCopy(text, done));
  }else{ hwfcFallbackCopy(text, done); }
}
function hwfcFallbackCopy(text, done){
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){ /* clipboard unsupported in this browser — non-fatal */ }
  ta.remove();
  done();
}
function hwfcDownloadPng(){
  if (!hwfcState.typedText || !hwfcState.typedText.trim()){ hwfcToast('Type something first to export.'); return; }
  const wrap = document.getElementById('hwfcPreviewCanvas').parentElement;
  const baseWidth = Math.max(280, wrap.clientWidth - 4);
  const multiplier = 3; /* high-resolution export */
  hwfcRenderMultiplier = multiplier;
  if (!hwfcMeasureCanvasEl) hwfcMeasureCanvasEl = document.createElement('canvas');
  const lines = hwfcLayoutText(hwfcState.typedText, baseWidth * multiplier, hwfcMeasureCanvasEl.getContext('2d'));
  const exportCanvas = document.createElement('canvas');
  hwfcRenderLinesToCanvas(exportCanvas, lines, { width: baseWidth * multiplier, ink: '#1a1a2e' });
  hwfcRenderMultiplier = 1;
  exportCanvas.toBlob((blob) => { if (blob) hwfcDownloadBlob(blob, 'my-handwriting-font.png'); }, 'image/png');
}
function hwfcResetTyping(){
  hwfcOpenConfirmModal('Clear typed text?', 'This clears the text box. Your handwriting and font are not affected.', 'Clear text', () => {
    hwfcState.typedText = ''; hwfcScheduleSave();
    const ta = document.getElementById('hwfcTypeArea'); if (ta) ta.value = '';
    hwfcTypingHistory = ['']; hwfcTypingHistoryIdx = 0;
    hwfcRefreshPreview();
  });
}
function hwfcConfirmNewFont(){
  hwfcOpenConfirmModal('Create a brand new font?', "This erases every letter you've drawn and starts over from scratch.", 'Erase & start over', () => {
    hwfcState = hwfcDefaultState();
    hwfcDbSet('profile', hwfcState);
    hwfcSetView('home');
  });
}

/* ── 18. DISPLAY SETTINGS MODAL ── */
function hwfcOpenSettingsPanel(){
  const s = hwfcState.settings;
  const wrap = document.createElement('div');
  wrap.className = 'modal-overlay';
  wrap.innerHTML = `<div class='modal-box hwfc-settings-modal'>
    <h3>Display Settings</h3>
    <div class='hwfc-setting-group'>
      <label class='hwfc-label'>Font Size</label>
      <div class='hwfc-seg'>${['small', 'medium', 'large'].map((sz) => `<button class='hwfc-seg-btn ${s.fontSize === sz ? 'active' : ''}' data-fs='${sz}'>${sz[0].toUpperCase() + sz.slice(1)}</button>`).join('')}</div>
    </div>
    <div class='hwfc-setting-group'>
      <label class='hwfc-label'>Letter Spacing — <span id='hwfcLsVal'>${s.letterSpacing}</span>px</label>
      <input type='range' min='0' max='20' value='${s.letterSpacing}' id='hwfcLsSlider' class='hwfc-slider' aria-label='Letter spacing'>
    </div>
    <div class='hwfc-setting-group'>
      <label class='hwfc-label'>Word Spacing — <span id='hwfcWsVal'>${s.wordSpacing}</span>px</label>
      <input type='range' min='0' max='40' value='${s.wordSpacing}' id='hwfcWsSlider' class='hwfc-slider' aria-label='Word spacing'>
    </div>
    <div class='hwfc-setting-group'>
      <label class='hwfc-label'>Line Height — <span id='hwfcLhVal'>${s.lineHeight.toFixed(1)}</span>×</label>
      <input type='range' min='10' max='25' value='${Math.round(s.lineHeight * 10)}' id='hwfcLhSlider' class='hwfc-slider' aria-label='Line height'>
    </div>
    <div class='hwfc-setting-group'>
      <label class='hwfc-label'>Theme</label>
      <div class='hwfc-seg'>${['light', 'dark', 'system'].map((m) => `<button class='hwfc-seg-btn ${s.themeMode === m ? 'active' : ''}' data-theme-mode='${m}'>${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
    </div>
    <div class='hwfc-setting-group'>
      <label class='hwfc-label'>Backup</label>
      <button class='btn btn-secondary' style='width:100%' onclick='hwfcExportProfile()'>Export Profile (.json)</button>
      <button class='btn btn-secondary' style='width:100%;margin-top:8px' onclick='document.getElementById("hwfcImportInput").click()'>Import Profile (.json)</button>
      <input type='file' id='hwfcImportInput' accept='application/json' style='display:none'>
    </div>
    <button class='btn btn-primary' style='width:100%;margin-top:6px' onclick="this.closest('.modal-overlay').remove()">Done</button>
  </div>`;
  document.body.appendChild(wrap);
  wrap.querySelectorAll('[data-fs]').forEach((btn) => btn.addEventListener('click', () => {
    s.fontSize = btn.dataset.fs; hwfcScheduleSave(); hwfcRefreshPreview();
    wrap.querySelectorAll('[data-fs]').forEach((b) => b.classList.toggle('active', b === btn));
  }));
  wrap.querySelectorAll('[data-theme-mode]').forEach((btn) => btn.addEventListener('click', () => {
    s.themeMode = btn.dataset.themeMode; hwfcScheduleSave(); hwfcApplyThemeMode();
    wrap.querySelectorAll('[data-theme-mode]').forEach((b) => b.classList.toggle('active', b === btn));
  }));
  const ls = wrap.querySelector('#hwfcLsSlider'), lsVal = wrap.querySelector('#hwfcLsVal');
  ls.addEventListener('input', () => { s.letterSpacing = parseInt(ls.value, 10); lsVal.textContent = s.letterSpacing; hwfcScheduleSave(); hwfcRefreshPreview(); });
  const ws = wrap.querySelector('#hwfcWsSlider'), wsVal = wrap.querySelector('#hwfcWsVal');
  ws.addEventListener('input', () => { s.wordSpacing = parseInt(ws.value, 10); wsVal.textContent = s.wordSpacing; hwfcScheduleSave(); hwfcRefreshPreview(); });
  const lh = wrap.querySelector('#hwfcLhSlider'), lhVal = wrap.querySelector('#hwfcLhVal');
  lh.addEventListener('input', () => { s.lineHeight = parseInt(lh.value, 10) / 10; lhVal.textContent = s.lineHeight.toFixed(1); hwfcScheduleSave(); hwfcRefreshPreview(); });
  wrap.querySelector('#hwfcImportInput').addEventListener('change', hwfcHandleImportFile);
}

/* ── 19. EXPORT / IMPORT HANDWRITING PROFILE (JSON) ── */
function hwfcExportProfile(){
  const payload = JSON.stringify(hwfcState, (k, v) => (k === '_imgEl' ? undefined : v));
  hwfcDownloadBlob(new Blob([payload], { type: 'application/json' }), 'handwriting-font-profile.json');
  hwfcToast('Profile exported.');
}
function hwfcHandleImportFile(e){
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== 'object' || !parsed.glyphs) throw new Error('Not a recognizable handwriting profile');
      const fresh = hwfcDefaultState();
      hwfcState = Object.assign(fresh, parsed);
      hwfcState.settings = Object.assign(fresh.settings, parsed.settings || {});
      hwfcState.optionalStatus = Object.assign(fresh.optionalStatus, parsed.optionalStatus || {});
      hwfcDbSet('profile', hwfcState).then(() => {
        hwfcToast('Profile imported.');
        document.querySelectorAll('.modal-overlay').forEach((m) => m.remove());
        hwfcSetView(hwfcState.fontGenerated ? 'typing' : 'review');
      });
    }catch(err){
      hwfcToast('That file could not be read as a handwriting profile.');
    }
  };
  reader.readAsText(file);
}
