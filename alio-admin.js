/* alio-admin.js — Admin dashboard (loaded on demand by index.html after the PIN lock). Classic script: shares globals with index.html. */
function renderAdminShell(){
  appEl.innerHTML='<section class="admin-wrap">'
    +'<div class="back-row">'
      +'<button class="back-btn" onclick="go(\'home\')">← Home</button>'
      +'<button class="back-btn" onclick="adminChangePinPrompt()">Change PIN</button>'
      +'<span id="adminTimer" title="Time left before the dashboard auto-locks" style="margin-left:auto;font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--sub)"></span>'
      +'<button class="back-btn" onclick="adminLock()">🔒 Lock</button>'
    +'</div>'
    +'<h2 class="section-title" style="margin-bottom:4px">Admin Dashboard</h2>'
    +'<p style="color:var(--muted);margin-bottom:22px">Signed in as '+escapeHTML(currentUser.displayName||currentUser.email||'')+'</p>'
    +adminMenuHTML()
    +'<div id="anNav">'+anNavHTML()+'</div><div id="adminPanelBody"></div>'
  +'</section>';
  modWatchReports();
  adminRenderPanel();
  adminTickStart();
}
function adminRenderPanel(){
  var el=document.getElementById('adminPanelBody'); if(!el) return;
  if(adminView==='flags') renderAdminFlagsPanel(el);
  else if(adminView==='analytics') renderAdminAnalyticsPanel(el);
  else if(adminView==='announcements') renderAdminAnnouncementsPanel(el);
  else if(adminView==='notify'&&window.renderAdminNotifyPanel) window.renderAdminNotifyPanel(el);
  else if(adminView==='community') renderAdminCommunityPanel(el);
  else if(adminView==='badges') renderAdminBadgesPanel(el);
  else if(adminView==='users') renderAdminUsersPanel(el);
  else if(adminView==='aliprofile') renderAdminAlioProfilePanel(el);
  else if(adminView==='appinfo'&&window.renderAdminAppInfoPanel) window.renderAdminAppInfoPanel(el);
  else if(adminView==='inbox') renderAdminInboxPanel(el);
  else if(adminView==='moderation') renderAdminModerationPanel(el);
  else if(adminView==='visitors') renderAdminVisitorsPanel(el);
  else if(adminView==='whatsnew') renderAdminWhatsNewPanel(el);
  else if(adminView==='popular') renderAdminPopularPanel(el);
}



/* ═══════════════════════ POPULAR ROW EDITOR (new) ═══════════════════════
   Admin chooses which apps, games, health tools and fun tools show in the Popular row on Home, and in what order. Stored in siteConfig/popular. */
function popLive(){ return (livePopular||KS_POP_DEFAULT||[]).slice(); }
function popSay(m,bad){ var s=document.getElementById('popStatus'); if(s){ s.style.color=bad?'#FF5A5A':'var(--sub)'; s.textContent=m; } }
function renderAdminPopularPanel(el){
  popEl=el; if(!popDraft) popDraft=popLive();
  el.innerHTML='<div class="admin-card"><div class="admin-card-head"><h3>🔥 Popular row</h3></div>'
    +'<p style="font-size:12.5px;color:var(--muted);margin:-6px 0 12px">These show in the fiery Popular row at the top of Home, in this order (up to 12). Anything can go here: apps, games, health tools, fun tools and more. Nothing changes for visitors until you press Save.</p>'
    +'<div id="popCur"></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-primary" onclick="popSave()">Save</button>'
    +'<button class="btn btn-ghost" onclick="popUndo()">Undo changes</button><button class="btn btn-ghost" onclick="popReset()">Starter list</button></div>'
    +'<div id="popStatus" style="font-size:13px;margin-top:10px"></div></div>'
    +'<div class="admin-card"><div class="admin-card-head"><h3>Add to Popular</h3></div>'
    +'<input class="ks-input" id="popSearch" placeholder="Search apps, games, health, fun…" autocomplete="off" oninput="popPickDraw()" style="margin:0 0 10px">'
    +'<div id="popPick"></div></div>';
  popCurDraw(); popPickDraw();
}
function popRowHTML(c,right){
  return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:12px;margin:0 0 6px">'
    +'<span style="font-size:20px;flex:0 0 auto">'+(c.icon||'•')+'</span>'
    +'<span style="flex:1;min-width:0"><span style="display:block;font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escapeHTML(c.name)+'</span><span style="font-size:11.5px;color:var(--muted)">'+escapeHTML(c.grp||'')+'</span></span>'+right+'</div>';
}
function popCurDraw(){
  var box=document.getElementById('popCur'); if(!box) return;
  var by={}; ksCatalog().forEach(function(c){ by[c.id]=c; });
  if(!popDraft.length){ box.innerHTML='<p class="admin-empty">The list is empty, so the Popular row is hidden on Home. Add something below.</p>'; return; }
  var b=function(label,fn,dis){ return '<button type="button" class="btn btn-ghost" style="padding:4px 9px;font-size:13px'+(dis?';opacity:.35':'')+'"'+(dis?' disabled':' onclick="'+fn+'"')+'>'+label+'</button>'; };
  box.innerHTML=popDraft.map(function(id,i){
    var c=by[id]||{id:id,icon:'❔',name:id+' (not found)',grp:'Missing: remove it'};
    return popRowHTML(c,'<span style="display:flex;gap:4px;flex:0 0 auto">'+b('↑','popMove('+i+',-1)',i===0)+b('↓','popMove('+i+',1)',i===popDraft.length-1)+b('✕','popRemove('+i+')')+'</span>');
  }).join('');
}
function popPickDraw(){
  var box=document.getElementById('popPick'); if(!box) return;
  var q=((document.getElementById('popSearch')||{}).value||'').trim().toLowerCase();
  var list=ksCatalog().filter(function(c){ return popDraft.indexOf(c.id)<0 && (!q || (c.name+' '+c.grp+' '+c.desc).toLowerCase().indexOf(q)>=0); });
  if(!list.length){ box.innerHTML='<p class="admin-empty">Nothing to add'+(q?' for “'+escapeHTML(q)+'”':'')+'.</p>'; return; }
  box.innerHTML=list.slice(0,60).map(function(c){
    return popRowHTML(c,'<button type="button" class="btn btn-ghost" style="padding:4px 10px;font-size:13px;flex:0 0 auto" onclick="popAdd(\''+escapeHTML(c.id)+'\')">+ Add</button>');
  }).join('')+(list.length>60?'<p style="font-size:12px;color:var(--muted)">Showing 60 of '+list.length+'. Type to narrow it down.</p>':'');
}
function popMove(i,d){ var j=i+d; if(j<0||j>=popDraft.length) return; var t=popDraft[i]; popDraft[i]=popDraft[j]; popDraft[j]=t; popCurDraw(); popSay(''); }
function popRemove(i){ popDraft.splice(i,1); popCurDraw(); popPickDraw(); popSay(''); }
function popAdd(id){ if(popDraft.length>=12){ popSay('The Popular row can hold up to 12.',true); return; } if(popDraft.indexOf(id)<0) popDraft.push(id); popCurDraw(); popPickDraw(); popSay(''); }
function popUndo(){ popDraft=popLive(); popCurDraw(); popPickDraw(); popSay('Back to what is saved.'); }
function popReset(){ popDraft=(KS_POP_DEFAULT||[]).slice(); popCurDraw(); popPickDraw(); popSay('Starter list loaded. Press Save to use it.'); }
function popSave(){
  var K=window.KSFirebase; if(!K||!K.setPopular){ popSay('Still connecting, try again in a moment.',true); return; }
  popSay('Saving…');
  K.setPopular(popDraft).then(function(){ popSay('✅ Saved. Everyone sees it now.'); }).catch(function(e){ popSay('Could not save: '+((e&&e.message)||e),true); });
}

/* ═══════════════════════ WHAT'S NEW EDITOR (new) ═══════════════════════
   Admins write the update notes shown in Settings → What's New. One update per line, newest first. Stored in siteConfig/whatsNew. */
function renderAdminWhatsNewPanel(el){
  var items=liveWhatsNew?liveWhatsNew.items:CHANGELOG, upd=(liveWhatsNew&&liveWhatsNew.updated)?liveWhatsNew.updated:APP_UPDATED;
  el.innerHTML='<div class="admin-card"><div class="admin-card-head"><h3>🆕 What\'s New</h3></div>'
    +'<p style="font-size:12.5px;color:var(--muted);margin:-6px 0 12px">Write one update per line, newest first. Emojis are welcome. Saving shows it to everyone straight away in Settings → What\'s New. '+(liveWhatsNew?'You are editing the saved version.':'Nothing saved yet: this is the built-in list, so edit it freely and save.')+'</p>'
    +'<label style="font-size:12.5px;font-weight:700">“Last updated” text</label>'
    +'<input class="ks-input" id="wnDate" maxlength="40" value="'+escapeHTML(upd)+'" style="margin:4px 0 12px">'
    +'<label style="font-size:12.5px;font-weight:700">Updates (one per line)</label>'
    +'<textarea class="ks-input" id="wnText" rows="14" style="margin:4px 0 12px;resize:vertical">'+escapeHTML(items.join('\n'))+'</textarea>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" onclick="wnSave()">Save</button>'
    +'<button class="btn btn-ghost" onclick="wnReset()">Reset to built-in list</button></div>'
    +'<div id="wnStatus" style="font-size:13px;margin-top:10px"></div></div>';
}
function wnSay(m,bad){ var s=document.getElementById('wnStatus'); if(s){ s.style.color=bad?'#FF5A5A':'var(--sub)'; s.textContent=m; } }
function wnSave(){
  var K=window.KSFirebase; if(!K||!K.setWhatsNew){ wnSay('Still connecting — try again in a moment.',true); return; }
  var lines=(document.getElementById('wnText').value||'').split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
  if(!lines.length){ wnSay('Write at least one update (or use Reset).',true); return; }
  var d=(document.getElementById('wnDate').value||'').trim()||APP_UPDATED;
  wnSay('Saving…');
  K.setWhatsNew(lines,d).then(function(){ wnSay('✅ Saved. Everyone sees it now.'); }).catch(function(e){ wnSay('Could not save: '+((e&&e.message)||e),true); });
}
function wnReset(){
  var K=window.KSFirebase; if(!K||!K.setWhatsNew) return;
  ksAsk('Delete your saved What\'s New and go back to the built-in list?',function(){
    K.setWhatsNew([],'').then(function(){ wnSay('✅ Back to the built-in list.'); setTimeout(function(){ if(adminView==='whatsnew'){ var el=document.getElementById('adminPanelBody'); if(el) renderAdminWhatsNewPanel(el); } },400); })
      .catch(function(e){ wnSay('Could not reset: '+((e&&e.message)||e),true); });
  },{okText:'Reset',title:'Reset What\'s New?'});
}

/* ═══════════════════════ VISITORS PANEL (new) ═══════════════════════
   Reads the anonymous visits/{day}_{id} records (rules: admins only). Nothing here identifies a person. */
function visDay(back){ return new Date(Date.now()-back*86400000).toISOString().slice(0,10); }
function renderAdminVisitorsPanel(el){
  visEl=el; visDraw();
  if(!visData||visLoadedRange!==visRange||Date.now()-visLoadedAt>300000) visLoad();
}
function visSetRange(n){ if(visBusy) return; visRange=n; visLoad(); }
function visLoad(force){
  var K=window.KSFirebase;
  if(!K||!K.adminFetchVisits){ visErr='Still connecting — try again in a moment.'; visDraw(); return; }
  if(visBusy) return;
  visBusy=true; visErr=''; visDraw();
  if(!visUsersAsked&&!ueLoaded&&K.adminListUsers){ visUsersAsked=true; K.adminListUsers().then(function(m){ Object.keys(m).forEach(function(u){ adminUsers[u]=m[u]; }); visDraw(); }).catch(function(){ visUsersAsked=false; }); }
  var want=visRange;
  K.adminFetchVisits(visDay(want-1),5000).then(function(l){ visData=l; visLoadedRange=want; visLoadedAt=Date.now(); })
    .catch(function(e){ visErr=(e&&e.code==='permission-denied')?'Not allowed — publish the new Firestore rules first (the visits block).':((e&&e.message)||'Could not load visits.'); })
    .then(function(){ visBusy=false; visDraw(); });
}
function visPurge(){
  var K=window.KSFirebase; if(!K||!K.adminPurgeVisits) return;
  ksAsk('Delete all visit records older than 90 days? This cannot be undone.',function(){
    visBusy=true; visDraw();
    K.adminPurgeVisits(visDay(90)).then(function(n){ visBusy=false; ksAlert('✅ Deleted '+n+' old visit record'+(n===1?'':'s')+'.'); visLoad(); })
      .catch(function(e){ visBusy=false; visDraw(); ksAlert('Could not delete: '+((e&&e.message)||e)); });
  },{okText:'Delete old records',title:'Delete old records?'});
}
function visCalc(l){
  var r={vids:{},nw:{},si:{},pwa:{},pv:0,pages:{},refs:{},dev:{},br:{},lang:{},reg:{},days:{}};
  l.forEach(function(x){
    var v=x.vid||''; if(!v) return;
    r.vids[v]=1; if(x.newv) r.nw[v]=1; if(x.signed) r.si[v]=1; if(x.pwa) r.pwa[v]=1;
    r.pv+=(typeof x.n==='number'?x.n:0);
    if(x.pg&&typeof x.pg==='object') Object.keys(x.pg).forEach(function(k){ r.pages[k]=(r.pages[k]||0)+(+x.pg[k]||0); });
    var rf=x.ref||'Direct / unknown'; r.refs[rf]=(r.refs[rf]||0)+1;
    var d=x.dev||'?'; r.dev[d]=(r.dev[d]||0)+1;
    var b=x.br||'Other'; r.br[b]=(r.br[b]||0)+1;
    var lg=(x.lang||'?'); r.lang[lg]=(r.lang[lg]||0)+1;
    var tz=x.tz||''; var rg=VIS_TZ[tz]||(tz?tz:'Unknown'); r.reg[rg]=(r.reg[rg]||0)+1;
    if(x.day){ (r.days[x.day]=r.days[x.day]||{})[v]=1; }
  });
  return r;
}
function visList(title,obj,note){
  var keys=Object.keys(obj).sort(function(a,b){ return obj[b]-obj[a]; }).slice(0,8);
  if(!keys.length) return '';
  var tot=Object.keys(obj).reduce(function(a,k){ return a+obj[k]; },0)||1;
  return '<div style="margin:0 0 18px"><div style="font-weight:700;margin-bottom:2px">'+title+'</div>'
    +(note?'<div style="font-size:11.5px;color:var(--muted);margin-bottom:6px">'+note+'</div>':'<div style="margin-bottom:6px"></div>')
    +keys.map(function(k){ var p=Math.round(obj[k]*100/tot);
      return '<div style="display:flex;align-items:center;gap:8px;font-size:13px;margin:4px 0"><span style="flex:0 0 42%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escapeHTML(k)+'</span>'
        +'<span style="flex:1;height:8px;border-radius:6px;background:var(--border);overflow:hidden"><span style="display:block;height:100%;width:'+Math.max(p,3)+'%;background:var(--accent)"></span></span>'
        +'<span style="flex:0 0 auto;color:var(--sub);font-variant-numeric:tabular-nums">'+obj[k]+'</span></div>'; }).join('')
    +'</div>';
}
function visStat(n,label){ return '<div style="flex:1 1 44%;min-width:120px;padding:12px;border:1px solid var(--border);border-radius:12px"><div style="font-size:24px;font-weight:800;font-variant-numeric:tabular-nums">'+n+'</div><div style="font-size:12px;color:var(--sub)">'+label+'</div></div>'; }
function visDraw(){
  var el=visEl; if(adminView==='analytics'&&el&&document.body.contains(el)) return anDraw();
  if(!el||!document.body.contains(el)||adminView!=='visitors') return;
  var rb=function(n,t){ return '<button class="btn '+(visRange===n?'btn-primary':'btn-ghost')+'" style="padding:7px 14px;font-size:13px" onclick="visSetRange('+n+')"'+(visBusy?' disabled':'')+'>'+t+'</button>'; };
  var h='<div class="admin-card"><div class="admin-card-head"><h3>📈 Visitors</h3><button class="btn btn-ghost" style="padding:6px 12px;font-size:12px" onclick="visLoad()"'+(visBusy?' disabled':'')+'>'+(visBusy?'Loading…':'Refresh')+'</button></div>'
    +'<p style="font-size:12.5px;color:var(--muted);margin:-6px 0 12px">Guests are anonymous. Signed-in visitors are linked to their account (only admins can see this). No IP addresses are stored. Days are in UTC. Region is a rough guess from the visitor’s time zone.</p>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px">'+rb(1,'Today')+rb(7,'7 days')+rb(30,'30 days')+'</div>'+visTabsHTML();
  if(visErr) h+='<p style="color:#FF5A5A">'+escapeHTML(visErr)+'</p>';
  if(!visData){ h+=visBusy?'<p class="admin-empty">Loading…</p>':''; el.innerHTML=h+'</div>'; return; }
  var r=visCalc(visData), nv=Object.keys(r.vids).length, nn=Object.keys(r.nw).length, ns=Object.keys(r.si).length, np=Object.keys(r.pwa).length;
  if(!nv){ el.innerHTML=h+'<p class="admin-empty">No visits recorded in this period yet.</p>'+visFooter()+'</div>'; return; }
  if(visTab==='cards'){ el.innerHTML=h+visCardsHTML()+visFooter()+'</div>'; return; }
  h+='<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px">'
    +visStat(nv,'Visitors (unique)')+visStat(visData.length,'Visits (visitor-days)')+visStat(r.pv,'Page views')
    +visStat(nn,'New (first seen in this period)')+visStat(nv-nn,'Returning (seen before)')+visStat(ns,'Signed in')+visStat(nv-ns,'Guests (no account)')+visStat(np,'Installed app')
  +'</div>'+visExplain();
  if(visRange>1){
    var ds=Object.keys(r.days).sort(), mx=1; ds.forEach(function(d){ mx=Math.max(mx,Object.keys(r.days[d]).length); });
    h+='<div style="margin:0 0 18px"><div style="font-weight:700;margin-bottom:8px">Visitors per day</div><div style="display:flex;align-items:flex-end;gap:3px;height:90px;overflow-x:auto">'
      +ds.map(function(d){ var c=Object.keys(r.days[d]).length; return '<div title="'+d+': '+c+'" style="flex:1 0 8px;min-width:8px;height:'+Math.max(4,Math.round(c*100/mx))+'%;background:var(--accent);border-radius:4px 4px 0 0"></div>'; }).join('')
      +'</div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px"><span>'+escapeHTML(ds[0]||'')+'</span><span>'+escapeHTML(ds[ds.length-1]||'')+'</span></div></div>';
  }
  h+=visList('Most opened sections',r.pages,'Page views')+visList('Where they came from',r.refs,'Visits, by website they came from')
    +visList('Region (estimated)',r.reg,'Visits, from the browser’s time zone')+visList('Devices',r.dev,'Visits')+visList('Browsers',r.br,'Visits')+visList('Languages',r.lang,'Visits');
  if(visData.length>=5000) h+='<p style="font-size:12px;color:#FF5A5A">Showing the first 5000 records only. Pick a shorter period.</p>';
  el.innerHTML=h+visFooter()+'</div>';
}

/* ── Visitor cards ── one card per visitor (random ID), grouped across days; signed-in visits carry the account ID (uid) ── */
function visTs(t){ try{ if(t&&typeof t.toMillis==='function') return t.toMillis(); if(t&&typeof t.seconds==='number') return t.seconds*1000; }catch(e){} return 0; }
function visWhen(ms){ if(!ms) return '—'; try{ return new Date(ms).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){ return '—'; } }
function visAgo(ms){ if(!ms) return '—'; var s=Math.max(0,Math.round((Date.now()-ms)/1000)); if(s<90) return 'just now'; if(s<3600) return Math.round(s/60)+' min ago'; if(s<86400) return Math.round(s/3600)+' h ago'; return Math.round(s/86400)+' d ago'; }
function visPeople(l){
  var m={};
  l.slice().sort(function(a,b){ return (a.day||'')<(b.day||'')?-1:1; }).forEach(function(x){
    var v=x.vid; if(!v) return;
    var p=m[v]=m[v]||{vid:v,days:{},n:0,pg:{},uid:'',signed:false,pwa:false,newv:false,ref:'',dev:'',br:'',lang:'',tz:'',first:0,last:0};
    var n=+x.n||0; p.n+=n; if(x.day) p.days[x.day]=(p.days[x.day]||0)+n;
    if(x.pg&&typeof x.pg==='object') Object.keys(x.pg).forEach(function(k){ p.pg[k]=(p.pg[k]||0)+(+x.pg[k]||0); });
    if(x.uid) p.uid=String(x.uid); if(x.signed) p.signed=true; if(x.pwa) p.pwa=true; if(x.newv) p.newv=true;
    if(x.ref&&!p.ref) p.ref=x.ref;
    if(x.dev) p.dev=x.dev; if(x.br) p.br=x.br; if(x.lang) p.lang=x.lang; if(x.tz) p.tz=x.tz;
    var f=visTs(x.first)||(x.day?Date.parse(x.day+'T12:00:00Z'):0), la=visTs(x.last)||f;
    if(f&&(!p.first||f<p.first)) p.first=f; if(la>p.last) p.last=la;
  });
  return Object.keys(m).map(function(k){ return m[k]; }).sort(function(a,b){ return b.last-a.last; });
}
function visTabsHTML(){
  var t=function(id,label){ return '<button class="btn '+(visTab===id?'btn-primary':'btn-ghost')+'" style="padding:7px 14px;font-size:13px" onclick="visSetTab(\''+id+'\')">'+label+'</button>'; };
  return '<div style="display:flex;gap:8px;margin:0 0 14px;padding-top:12px;border-top:1px solid var(--border)">'+t('overview','📊 Overview')+t('cards','🪪 Visitor cards')+'</div>';
}
function visSetTab(t){ visTab=t; visSel=null; visDraw(); }
function visOpen(v){ visSel=v; visDraw(); try{ window.scrollTo(0,0); }catch(e){} }
function visBack(){ visSel=null; visDraw(); }
function visFilterSet(f){ visFilter=f; visShown=30; visDraw(); }
function visMore(){ visShown+=30; visDraw(); }
function visOpenUser(uid){ adminSetView('users'); setTimeout(function(){ huOpen(uid); },60); }
function visExplain(){
  return '<details style="margin:0 0 18px;padding:10px 12px;border:1px solid var(--border);border-radius:12px"><summary style="cursor:pointer;font-weight:700">ℹ️ Visitor or guest: what is the difference?</summary>'
    +'<div style="font-size:12.5px;color:var(--sub);margin-top:8px;line-height:1.6">'
    +'<b>Visitor</b> = one browser or device that opened Alio. It is counted once, however many pages or days it visited.<br>'
    +'<b>Guest</b> = a visitor who was never signed in.<br>'
    +'<b>Signed in</b> = a visitor who was signed in to an account during the period.<br>'
    +'So <b>Visitors = Signed in + Guests</b>.<br><br>'
    +'The same person on two devices counts as two visitors, and clearing browser data makes a new visitor. A guest who makes an account later turns into a linked visitor, because the same browser ID now carries the account ID.'
    +'</div></details>';
}
function visChip(t,c){ return '<span style="font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid '+c+';color:'+c+';white-space:nowrap">'+t+'</span>'; }
function visTypeChip(p){ return p.uid?visChip('🔗 Linked to account','#3DDC97'):(p.signed?visChip('👤 Signed in','#6AA7FF'):visChip('🕶️ Guest','#8a93a8')); }
function visCardHTML(p){
  var u=p.uid?adminPerson(p.uid):null;
  var title=u?u.name:((p.signed||p.uid)?'Signed-in visitor':'Guest');
  var dev=({mobile:'📱',tablet:'📟',desktop:'💻'})[p.dev]||'❔';
  var days=Object.keys(p.days).length;
  return '<div onclick="visOpen(\''+p.vid+'\')" style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--border);border-radius:14px;margin:0 0 8px;cursor:pointer">'
    +'<div style="width:40px;height:40px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;flex:0 0 auto">'+dev+'</div>'
    +'<div style="flex:1;min-width:0"><div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escapeHTML(title)+' <span style="font-weight:400;color:var(--muted);font-size:12px">#'+escapeHTML(p.vid.slice(0,4).toUpperCase())+'</span></div>'
    +'<div style="font-size:12px;color:var(--sub);margin-top:2px">'+visAgo(p.last)+' · '+days+(days===1?' day':' days')+' · '+p.n+(p.n===1?' page view':' page views')+'</div>'
    +'<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">'+visTypeChip(p)+(p.pwa?visChip('📲 App','#C08BFF'):'')+(p.newv?visChip('✨ New','#FFB84D'):'')+'</div></div>'
    +'<button type="button" aria-label="Visitor details" style="flex:0 0 auto;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:transparent;color:var(--accent);font-weight:800;font-family:serif;font-style:italic;cursor:pointer">i</button></div>';
}
function visCardsHTML(){
  var all=visPeople(visData||[]);
  if(visSel){ var one=null; all.forEach(function(x){ if(x.vid===visSel) one=x; }); if(one) return visDetailHTML(one); visSel=null; }
  var isSigned=function(p){ return !!(p.signed||p.uid); };
  var nLinked=all.filter(function(p){ return !!p.uid; }).length, nSigned=all.filter(isSigned).length, nGuest=all.length-nSigned;
  var list=all.filter(function(p){ return visFilter==='linked'?!!p.uid:visFilter==='signed'?isSigned(p):visFilter==='guest'?!isSigned(p):true; });
  var pct=all.length?Math.round(nGuest*100/all.length):0;
  var fb=function(id,t,n){ return '<button class="btn '+(visFilter===id?'btn-primary':'btn-ghost')+'" style="padding:6px 12px;font-size:12.5px" onclick="visFilterSet(\''+id+'\')">'+t+' '+n+'</button>'; };
  var h='<div style="margin:0 0 16px"><div style="font-weight:700;margin-bottom:6px">Who is visiting</div>'
    +'<div style="display:flex;height:12px;border-radius:8px;overflow:hidden;background:var(--border)"><span style="width:'+(100-pct)+'%;background:var(--accent)"></span><span style="width:'+pct+'%;background:#8a93a8"></span></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--sub);margin-top:4px"><span>Signed in: '+nSigned+'</span><span>Guests: '+nGuest+'</span></div></div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px">'+fb('all','All',all.length)+fb('linked','🔗 Linked',nLinked)+fb('signed','👤 Signed in',nSigned)+fb('guest','🕶️ Guests',nGuest)+'</div>';
  if(!list.length) return h+'<p class="admin-empty">No visitors in this view.</p>';
  h+=list.slice(0,visShown).map(visCardHTML).join('');
  if(list.length>visShown) h+='<button class="btn btn-ghost" style="width:100%;margin-top:6px" onclick="visMore()">Show more ('+(list.length-visShown)+' left)</button>';
  return h;
}
function visRow(k,v){ return '<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--sub)">'+k+'</span><span style="text-align:right;word-break:break-word">'+v+'</span></div>'; }
function visDetailHTML(p){
  var signed=!!(p.signed||p.uid), u=p.uid?adminPerson(p.uid):null;
  var days=Object.keys(p.days).sort(), mx=1; days.forEach(function(d){ mx=Math.max(mx,p.days[d]); });
  var h='<button class="back-btn" onclick="visBack()">← All visitors</button>'
    +'<div style="display:flex;align-items:center;gap:10px;margin:12px 0 4px"><div style="font-size:22px;font-weight:800">'+escapeHTML(u?u.name:(signed?'Signed-in visitor':'Guest'))+'</div></div>'
    +'<div style="margin:0 0 14px;display:flex;gap:6px;flex-wrap:wrap">'+visTypeChip(p)+(p.pwa?visChip('📲 Installed app','#C08BFF'):'')+(p.newv?visChip('✨ New visitor','#FFB84D'):visChip('↩️ Returning','#8a93a8'))+'</div>';
  if(p.uid){
    h+='<div style="padding:12px;border:1px solid var(--border);border-radius:14px;margin:0 0 14px"><div style="display:flex;gap:12px;align-items:center">'+adminAvatarHTML(u,44)
      +'<div style="min-width:0"><div style="font-weight:700">'+escapeHTML(u.name)+'</div>'
      +'<div style="font-size:12.5px;color:var(--sub);word-break:break-all">'+escapeHTML(u.email||'(email not loaded)')+(u.username?' · @'+escapeHTML(u.username):'')+'</div></div></div>'
      +'<button class="btn btn-primary" style="margin-top:10px;width:100%" onclick="visOpenUser(\''+escapeHTML(p.uid)+'\')">Open this user’s profile</button></div>';
  } else if(signed){
    h+='<p style="font-size:12.5px;color:var(--sub);margin:0 0 14px">Signed in, but these visits were recorded before account linking existed, so there is no account to link to.</p>';
  } else {
    h+='<p style="font-size:12.5px;color:var(--sub);margin:0 0 14px">Guest: never signed in during this period, so there is no account to link. If this browser signs in later, its card links to that account automatically.</p>';
  }
  h+='<div style="margin:0 0 16px">'
    +visRow('First seen',visWhen(p.first))+visRow('Last seen',visWhen(p.last)+' ('+visAgo(p.last)+')')
    +visRow('Days active',days.length)+visRow('Page views',p.n)
    +visRow('Device',escapeHTML(p.dev?p.dev.charAt(0).toUpperCase()+p.dev.slice(1):'?'))+visRow('Browser',escapeHTML(p.br||'?'))
    +visRow('Language',escapeHTML(p.lang||'?'))+visRow('Region (estimated)',escapeHTML(VIS_TZ[p.tz]||p.tz||'Unknown'))
    +visRow('Came from',escapeHTML(p.ref||'Direct / unknown'))+visRow('Visitor ID','<span style="font-family:monospace;font-size:12px">'+escapeHTML(p.vid)+'</span>')
    +'</div>';
  if(days.length>1){
    h+='<div style="margin:0 0 18px"><div style="font-weight:700;margin-bottom:8px">Page views per day</div><div style="display:flex;align-items:flex-end;gap:3px;height:70px;overflow-x:auto">'
      +days.map(function(d){ return '<div title="'+d+': '+p.days[d]+'" style="flex:1 0 8px;min-width:8px;height:'+Math.max(6,Math.round(p.days[d]*100/mx))+'%;background:var(--accent);border-radius:4px 4px 0 0"></div>'; }).join('')
      +'</div><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px"><span>'+escapeHTML(days[0])+'</span><span>'+escapeHTML(days[days.length-1])+'</span></div></div>';
  }
  return h+visList('Pages opened',p.pg,'Page views');
}

/* ── Per-user analytics (admin): which tools/games a user opens most, from their linked visit records (last 90 days) ── */
function huUserAnalytics(){
  var uid=huSel, K=window.KSFirebase; if(!uid) return;
  var old=document.getElementById('huAnModal'); if(old) old.remove();
  var m=document.createElement('div'); m.id='huAnModal'; m.className='modal-overlay';
  m.innerHTML='<div class="modal-box" style="max-width:520px;width:94vw;max-height:86vh;overflow-y:auto;text-align:left"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><h3 style="margin:0">📊 User analytics</h3><button class="btn btn-ghost" style="padding:5px 12px" data-x="1">Close</button></div><div id="huAnBody"><p class="admin-empty">Loading…</p></div></div>';
  document.body.appendChild(m);
  m.onclick=function(e){ if(e.target===m||(e.target.getAttribute&&e.target.getAttribute('data-x'))) m.remove(); };
  var body=m.querySelector('#huAnBody');
  if(!K||!K.adminFetchVisits){ body.innerHTML='<p style="color:#FF5A5A">Still connecting — try again in a moment.</p>'; return; }
  K.adminFetchVisits(visDay(89),5000).then(function(l){
    var mine=(l||[]).filter(function(x){ return x.uid===uid; });
    if(!mine.length){ body.innerHTML='<p class="admin-empty">No visit records are linked to this user in the last 90 days, so there is nothing to analyse yet.</p>'; return; }
    var p=visPeople(mine), r=visCalc(mine), nm=anMap();
    var tot=0, first=0, last=0, days={}, dev={}, pgs={};
    p.forEach(function(x){ tot+=x.n; if(x.first&&(!first||x.first<first)) first=x.first; if(x.last>last) last=x.last; Object.keys(x.days).forEach(function(d){ days[d]=1; }); if(x.dev) dev[x.dev]=(dev[x.dev]||0)+x.n; });
    var tools={}, cats={}, secs={};
    Object.keys(r.pages).forEach(function(k){
      var i=nm[k], n=r.pages[k]; if(!n) return;
      if(i){ if(i.g==='Sections') secs[i.l]=n; else { tools[i.l]=n; cats[i.g]=(cats[i.g]||0)+n; } }
      else secs[k]=n;
    });
    var top=Object.keys(tools).sort(function(a,b){ return tools[b]-tools[a]; })[0];
    var h='<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">'+visStat(tot,'Page views')+visStat(Object.keys(days).length,'Days active')+visStat(p.length,p.length===1?'Device':'Devices')+visStat(top?escapeHTML(top):'—','Most used tool')+'</div>'
      +visRow('First seen',visWhen(first))+visRow('Last seen',visWhen(last)+' ('+visAgo(last)+')')+'<div style="height:14px"></div>'
      +visList('🔥 Most used tools & games',tools,'Opens, last 90 days')+visList('Favourite categories',cats,'Opens by group')+visList('Sections opened',secs,'Hub pages and big sections')+visList('Devices',dev,'Page views');
    body.innerHTML=h;
  }).catch(function(e){ body.innerHTML='<p style="color:#FF5A5A">'+escapeHTML((e&&e.code==='permission-denied')?'Not allowed — check the Firestore visits rules.':((e&&e.message)||'Could not load analytics.'))+'</p>'; });
}
function visFooter(){
  return '<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:6px"><div style="font-size:12px;color:var(--muted);margin-bottom:8px">Records are kept for up to 90 days. Older ones are also cleared automatically (once a day) when you open Analytics.</div>'
    +'<button class="btn btn-ghost" style="padding:7px 14px;font-size:13px" onclick="visPurge()"'+(visBusy?' disabled':'')+'>🗑️ Delete records older than 90 days</button></div>';
}

function adminErrorHtml(err){
  return '<div class="admin-card"><p style="color:#FF5A5A">'+escapeHTML(ksFriendlyAuthError?ksFriendlyAuthError(err):'Something went wrong.')+'</p></div>';
}

/* ═══════════════════════ USERS HUB (added) ═══════════════════════
   One place for everything about a person: search → tap a user → one profile page with
   Overview · Edit profile · Moderate, plus quick actions (message, badge, email, copy ID).
   UX only — the real gate is Firestore's isAdmin() rules. Admin accounts can't be edited or moderated here.
   Every edit, warning and ban is written to the moderation log. */
function ueIsAdminUid(u){ return COMMUNITY_ADMIN_UIDS.indexOf(u)!==-1; }
function ueMsg(e){ return (e&&e.message)?e.message:String(e||'Something went wrong.'); }
function huLive(){ return adminView==='users' && huEl && document.body.contains(huEl); }
function ueShrinkDataUrl(dataUrl){
  return new Promise(function(resolve){
    try{
      if(typeof dataUrl!=='string'||dataUrl.length<UE_SHRINK_MIN||dataUrl.indexOf('data:image/')!==0) return resolve(null);
      var img=new Image();
      img.onload=function(){
        try{
          var side=Math.min(img.width,img.height); if(!side) return resolve(null);
          var c=document.createElement('canvas'); c.width=UE_PIC_PX; c.height=UE_PIC_PX;
          c.getContext('2d').drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,UE_PIC_PX,UE_PIC_PX);
          var small=c.toDataURL('image/jpeg',UE_PIC_Q);
          resolve(small&&small.length<dataUrl.length?small:null);
        }catch(e){ resolve(null); }
      };
      img.onerror=function(){ resolve(null); };
      img.src=dataUrl;
    }catch(e){ resolve(null); }
  });
}
function ueKB(s){ return Math.max(1,Math.round(((s||'').length)/1024))+' KB'; }
function ueBigPics(){
  return Object.keys(adminUsers).filter(function(u){
    var p=adminUsers[u]&&adminUsers[u].photoDataUrl;
    return DM_UID_RE.test(u)&&!ueIsAdminUid(u)&&typeof p==='string'&&p.length>=UE_SHRINK_MIN&&p.indexOf('data:image/')===0;
  });
}
function ueBulkCardHTML(){
  if(!ueLoaded) return '';
  var n=ueBigPics().length;
  return '<div style="margin:0 0 14px;padding:12px 14px;border:1px solid var(--border);border-radius:12px">'
    +'<div style="font-weight:700">🗜️ Shrink old profile pictures</div>'
    +'<div id="ueBulkInfo" style="font-size:12.5px;color:var(--sub);margin:4px 0 10px">'+(n?n+' account'+(n===1?' has':'s have')+' a picture bigger than the new 96×96 size. Shrinking them does not need the users to log in.':'Every picture is already small. Nothing to do.')+'</div>'
    +(n?'<button class="btn btn-primary" id="ueBulkBtn" onclick="ueBulkShrink()">Shrink '+n+' picture'+(n===1?'':'s')+' to 96×96</button>':'')
  +'</div>';
}
function ueBulkShrink(){
  if(ueBulkBusy) return;
  var K=window.KSFirebase; if(!K||!K.adminEditUserProfile){ ksAlert('Still connecting — try again in a moment.'); return; }
  var ids=ueBigPics(); if(!ids.length) return;
  ksAsk('Shrink '+ids.length+' profile picture'+(ids.length===1?'':'s')+' to 96×96? Names and everything else stay as they are. Each one is saved to the moderation log.',function(){
    ueBulkBusy=true;
    var btn=document.getElementById('ueBulkBtn'), info=document.getElementById('ueBulkInfo');
    if(btn) btn.disabled=true;
    var done=0, failed=0, skipped=0, saved=0, i=0;
    var say=function(t){ var el=document.getElementById('ueBulkInfo'); if(el) el.textContent=t; };
    var next=function(){
      if(i>=ids.length){
        ueBulkBusy=false;
        huRefreshList();
        ksAlert('✅ Shrunk '+done+' picture'+(done===1?'':'s')+' (about '+Math.round(saved/1024)+' KB freed)'+(skipped?', '+skipped+' already small':'')+(failed?', '+failed+' failed — usually a missing username record or the rules not published yet':'')+'.');
        return;
      }
      var uid=ids[i++], orig=(adminUsers[uid]||{}).photoDataUrl;
      say('Shrinking '+i+' of '+ids.length+'…');
      ueShrinkDataUrl(orig).then(function(small){
        if(!small){ skipped++; return; }
        return K.adminEditUserProfile(uid,{photoDataUrl:small,note:'resized to 96x96'}).then(function(r){
          if(r&&r.changed){ done++; saved+=orig.length-small.length; adminUsers[uid].photoDataUrl=small; } else skipped++;
        });
      }).catch(function(){ failed++; }).then(next);
    };
    next();
  },{okText:'Shrink pictures',title:'Shrink pictures?'});
}

function ueMsg(e){ return (e&&e.message)?e.message:String(e||'Something went wrong.'); }
function huRefreshList(){ if(huLive()&&!huSel){ var bk=document.getElementById('huBulk'); if(bk&&!ueBulkBusy) bk.innerHTML=ueBulkCardHTML(); huFillList(); } }
function renderAdminUsersPanel(el){
  huEl=el;
  try{ ksStartBadges(); }catch(e){}
  modWatchReports();
  if(huSel) huRenderProfile(); else huRenderList();
  if(!ueLoaded&&!ueLoading) huLoadUsers();
}
function huLoadUsers(){
  var K=window.KSFirebase;
  if(!K||!K.adminListUsers){ ueErr='Still connecting — try again in a moment.'; huRefreshList(); return; }
  ueLoading=true; ueErr=''; huRefreshList();
  K.adminListUsers().then(function(m){
    Object.keys(m).forEach(function(u){ adminUsers[u]=m[u]; });
    ueLoaded=true; ueLoading=false; huRefreshList();
    var ids=Object.keys(m).filter(function(u){ return DM_UID_RE.test(u) && !(u in adminUnames); });
    if(ids.length&&K.adminFetchUsernames) K.adminFetchUsernames(ids).then(function(r){
      ids.forEach(function(u){ adminUnames[u]=r[u]||''; }); huRefreshList();
    });
  }).catch(function(err){ ueLoading=false; ueErr='Could not load users: '+ueMsg(err); huRefreshList(); });
}

/* ── small shared pieces ── */
function huBadgeSvg(uid){
  var b=(typeof ksBadges!=='undefined')&&ksBadges[uid]; if(!b) return '';
  var t=ksBadgeType(b.type);
  return ' '+ksBadgeSVG(t.color,t.tick).replace('<svg','<svg style="width:15px;height:15px;vertical-align:middle"');
}
function huAvatar(pic,name,size,uid){
  var inner=pic?'<img src="'+escapeHTML(pic)+'" alt="" style="width:100%;height:100%;object-fit:cover">':escapeHTML(((name||'').trim().charAt(0)||'?').toUpperCase());
  return '<div class="ks-chat-avatar"'+(uid?ksOD(uid,1):'')+' style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.42)+'px;flex:0 0 '+size+'px">'+inner+'</div>';
}
function huOpenReportsFor(uid){ return modRep.filter(function(r){ return r.reportedUid===uid&&(r.status||'open')==='open'; }); }
function huChip(txt,col){ return '<span style="display:inline-block;font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:99px;border:1px solid '+col+';color:'+col+'">'+txt+'</span>'; }
function huSecLabel(t){ return '<div style="font-size:11.5px;font-weight:700;letter-spacing:.05em;color:var(--sub);margin:18px 0 6px;text-transform:uppercase">'+t+'</div>'; }

/* ── LIST ── */
function huRenderList(){
  if(!huEl) return;
  var chip=function(id,label){ return '<button class="admin-tab'+(huFilter===id?' active':'')+'" style="padding:6px 14px;font-size:12.5px" onclick="huSetFilter(\''+id+'\')">'+label+'</button>'; };
  huEl.innerHTML='<div class="admin-card">'
    +'<div class="admin-card-head"><h3>👥 Users</h3><button class="btn btn-ghost" id="huRefreshBtn" style="padding:6px 12px;font-size:12px" onclick="huRefreshAll()">\uD83D\uDD04 Refresh</button></div>'
    +'<p style="color:var(--muted);font-size:13.5px;margin:0 0 14px">Search anyone, then tap them to message, edit their profile, give a badge, warn or ban — all from one profile page.</p>'
    +'<input class="ks-input" id="huSearch" type="search" placeholder="Search name, @username, email or user ID…" autocomplete="off" value="'+escapeHTML(huQ)+'" oninput="huSearchInput(this.value)">'
    +'<div class="admin-tabs" style="margin:12px 0 0;padding-bottom:0;border-bottom:0">'+chip('all','All')+chip('badged','🏅 Badged')+'<button class="admin-tab'+(huFilter==='online'?' active':'')+'" id="huOnlineChip" style="padding:6px 14px;font-size:12.5px" onclick="huSetFilter(\'online\')">'+huOnlineLabel()+'</button>'+chip('reported','🚩 Reported')+'</div>'
    +'<div id="huCount" style="font-size:12px;color:var(--sub);margin:12px 2px 6px"></div>'
    +'<div id="huList"></div>'
  +'</div>'
  +'<details class="admin-card" style="cursor:default"><summary style="cursor:pointer;font-weight:700">🧰 Tools</summary><div id="huBulk" style="margin-top:12px">'+ueBulkCardHTML()+'</div></details>';
  huFillList();
}
function huRefreshAll(){
  var b=document.getElementById('huRefreshBtn'); if(b){ b.disabled=true; b.textContent='Refreshing...'; }
  var done=function(){ var b2=document.getElementById('huRefreshBtn'); if(b2){ b2.disabled=false; b2.textContent='\uD83D\uDD04 Refresh'; } try{ var c=document.getElementById('huOnlineChip'); if(c) c.textContent=huOnlineLabel(); if(huLive()&&!huSel) huFillList(); }catch(e){} };
  var pr=(window.KSPresence&&window.KSPresence.refresh)?window.KSPresence.refresh():null;
  Promise.resolve(pr).then(done,done);
  try{ huLoadUsers(); }catch(e){}
}
function huOnlineLabel(){ var n=0; try{ Object.keys(adminUsers).forEach(function(u){ if(window.KSPresence&&window.KSPresence.isOnlineAdmin(u)) n++; }); }catch(e){} return '\uD83D\uDFE2 Online ('+n+')'; }
window.addEventListener('ks-presence',function(){ try{ if(typeof huLive==='function'&&huLive()&&!huSel){ var c=document.getElementById('huOnlineChip'); if(c) c.textContent=huOnlineLabel(); if(huFilter==='online') huFillList(); } }catch(e){} });
function huSetFilter(f){ huFilter=f; huShown=40; huRenderList(); }
function huSearchInput(v){ huQ=String(v||'').trim().toLowerCase(); huShown=40; huFillList(); }
function huMore(){ huShown+=40; huFillList(); }
function huMatches(){
  var q=huQ.replace(/^@/,'');
  return Object.keys(adminUsers).filter(function(u){ return DM_UID_RE.test(u); }).map(function(u){ return adminPerson(u); }).filter(function(p){
    if(huFilter==='badged'&&!(typeof ksBadges!=='undefined'&&ksBadges[p.uid])) return false;
    if(huFilter==='reported'&&!huOpenReportsFor(p.uid).length) return false;
    if(huFilter==='online'&&!(window.KSPresence&&window.KSPresence.isOnlineAdmin(p.uid))) return false;
    if(!q) return true;
    return (p.name||'').toLowerCase().indexOf(q)!==-1 || (p.username||'').toLowerCase().indexOf(q)!==-1
      || (p.email||'').toLowerCase().indexOf(q)!==-1 || p.uid.toLowerCase().indexOf(q)!==-1;
  }).sort(function(a,b){ return a.name.toLowerCase()<b.name.toLowerCase()?-1:1; });
}
function huFillList(){
  var list=document.getElementById('huList'), cnt=document.getElementById('huCount'); if(!list) return;
  if(ueErr){ list.innerHTML='<p class="admin-empty" style="color:#FF5A5A">'+escapeHTML(ueErr)+'</p><button class="btn btn-ghost" onclick="huLoadUsers()">Try again</button>'; if(cnt) cnt.textContent=''; return; }
  if(!ueLoaded){ list.innerHTML='<p class="admin-empty">Loading users…</p>'; if(cnt) cnt.textContent=''; return; }
  var all=huMatches(), shown=all.slice(0,huShown);
  if(cnt) cnt.textContent=all.length+(all.length===1?' user':' users')+((huQ||huFilter!=='all')?' found':'');
  if(!all.length){ list.innerHTML='<p class="admin-empty">No users match.</p>'; return; }
  list.innerHTML=shown.map(function(p){
    var rp=huOpenReportsFor(p.uid).length;
    return '<div class="ks-chat-row" onclick="huOpen(\''+p.uid+'\')">'+adminAvatarHTML(p,42)
      +'<div class="ks-chat-main"><div class="ks-chat-name">'+escapeHTML(p.name)+huBadgeSvg(p.uid)+(ueIsAdminUid(p.uid)?' <span class="community-admin-badge">Admin</span>':'')+'</div>'
      +'<div class="ks-chat-prev">'+(p.username?'@'+escapeHTML(p.username)+' · ':'')+escapeHTML(p.email||p.uid)+'</div></div>'
      +(rp?huChip('🚩 '+rp,'#FF5A5A'):'')+'<span style="color:var(--sub);font-size:20px;margin-left:6px">›</span></div>';
  }).join('')+(all.length>shown.length?'<button class="btn btn-ghost" style="width:100%;margin-top:10px" onclick="huMore()">Show more ('+(all.length-shown.length)+' left)</button>':'');
}

/* ── OPEN A PROFILE ── */
function huOpen(uid,tab){
  if(!DM_UID_RE.test(uid||'')) return;
  var K=window.KSFirebase;
  huSel=uid; huTab=tab||'overview'; huData=null; huMod=null; huModErr=false; huPosts=null; huPostsBusy=false; huDraft=null; huErr=''; huFlash='';
  var id=++huLoadId;
  adminWatchUids([uid]);
  if(huLive()) huRenderProfile();
  if(!K||!K.adminGetUserFull){ huErr='Still connecting — try again in a moment.'; if(huLive()) huRenderProfile(); return; }
  K.adminGetUserFull(uid).then(function(f){
    if(id!==huLoadId) return;
    huData=f; if(f.user) adminUsers[uid]=Object.assign({},adminUsers[uid]||{},f.user);
    adminUnames[uid]=(f.pub&&f.pub.username)||'';
    huResetDraft(); huRenderProfile();
    return K.adminGetModeration(uid,(f.user&&f.user.email)||'').then(function(m){ if(id===huLoadId){ huMod=m; huRenderProfile(); } })
      .catch(function(){ if(id===huLoadId){ huModErr=true; huRenderProfile(); } });
  }).catch(function(err){ if(id!==huLoadId) return; huErr='Could not load this profile: '+ueMsg(err); huRenderProfile(); });
}
function huClose(){ huSel=null; huData=null; huMod=null; huDraft=null; huErr=''; huFlash=''; huLoadId++; if(huLive()) huRenderList(); }
function huSetTab(t){ huReadDraft(); huTab=t; huFlash=''; huRenderProfile(); }
function huEmail(){ return (huData&&huData.user&&huData.user.email)||(adminUsers[huSel]&&adminUsers[huSel].email)||''; }
function huResetDraft(){
  var pub=(huData&&huData.pub)||{}, usr=(huData&&huData.user)||{};
  huDraft={ name:(pub.displayName||usr.displayName||''), username:(pub.username||''), isPrivate:!!pub.isPrivate, hideBoard:!!pub.hideBoard, photo:undefined, reason:'', notify:false, lock:!!(huData&&huData.locked) };
}
function huPic(){
  if(!huData) return null;
  if(huDraft&&huDraft.photo!==undefined) return huDraft.photo;
  return ksSafePic(huData.pub&&huData.pub.photoDataUrl)||ksSafePic(huData.user&&huData.user.photoDataUrl)||null;
}
function huReadDraft(){
  if(!huDraft) return;
  var g=function(id){ return document.getElementById(id); };
  if(g('ueName')) huDraft.name=g('ueName').value;
  if(g('ueUser')) huDraft.username=g('ueUser').value;
  if(g('uePriv')) huDraft.isPrivate=g('uePriv').checked;
  if(g('ueBoard')) huDraft.hideBoard=g('ueBoard').checked;
  if(g('ueLock')) huDraft.lock=g('ueLock').checked;
  if(g('ueReason')) huDraft.reason=g('ueReason').value;
  if(g('ueNotify')) huDraft.notify=g('ueNotify').checked;
}
function huStanding(){
  var i=huMod; if(!i) return {txt:huModErr?'Could not check':'Checking…',col:'var(--sub)',active:false,line:''};
  var b=i.ban||i.emailBan, active=false, line='';
  if(b){
    var until=b.type==='permanent'?Infinity:(b.until&&b.until.toMillis?b.until.toMillis():0); active=until>Date.now();
    line=active?((b.type==='permanent'?'Permanently banned':'Banned until '+new Date(until).toLocaleString('en-GB'))+(b.reason?' — '+b.reason:'')):('Earlier ban has expired'+(b.reason?' ('+b.reason+')':''));
  }
  if(active) return {txt:'🚫 Banned',col:'#FF5A5A',active:true,line:line};
  var w=(i.warns||[]).length;
  return {txt:w?'⚠️ '+w+' warning'+(w===1?'':'s'):'✅ Good standing',col:w?'#F5B042':'#3DDC97',active:false,line:line};
}

/* ── PROFILE PAGE ── */
function huRenderProfile(){
  if(!huLive()||!huSel) return;
  var uid=huSel, back='<button class="btn btn-ghost" style="padding:6px 12px;margin-bottom:12px" onclick="huClose()">← All users</button>';
  if(huErr){ huEl.innerHTML='<div class="admin-card">'+back+'<p class="admin-empty" style="color:#FF5A5A">'+escapeHTML(huErr)+'</p></div>'; return; }
  if(!huData||!huDraft){ var p0=adminPerson(uid); huEl.innerHTML='<div class="admin-card">'+back+'<div style="display:flex;align-items:center;gap:12px">'+adminAvatarHTML(p0,56)+'<div style="font-weight:700">'+escapeHTML(p0.name)+'</div></div><p class="admin-empty">Loading profile…</p></div>'; return; }
  var usr=huData.user||{}, pub=huData.pub||{}, locked=ueIsAdminUid(uid);
  var name=(pub.displayName||usr.displayName||adminPerson(uid).name||'').trim()||('User '+uid.slice(0,6));
  var st=huStanding(), un=pub.username||'', email=usr.email||'';
  var hasBadge=(typeof ksBadges!=='undefined')&&!!ksBadges[uid];
  var rpOpen=huOpenReportsFor(uid).length;
  var act=function(label,fn,cls){ return '<button class="btn '+(cls||'btn-ghost')+'" style="padding:8px 14px;font-size:13px" onclick="'+fn+'">'+label+'</button>'; };
  var head='<div class="admin-card">'+back
    +'<div style="display:flex;align-items:center;gap:14px">'+huAvatar(ksSafePic(pub.photoDataUrl)||ksSafePic(usr.photoDataUrl),name,72,uid)
      +'<div style="min-width:0;flex:1">'
        +'<div style="font-family:Syne,sans-serif;font-weight:700;font-size:19px;word-break:break-word">'+escapeHTML(name)+huBadgeSvg(uid)+(locked?' <span class="community-admin-badge">Admin</span>':'')+'</div>'
        +'<div style="font-size:13px;color:var(--sub);word-break:break-all">'+(un?'@'+escapeHTML(un)+' · ':'')+escapeHTML(email||'No email on file')+'</div>'
        +'<div style="margin-top:6px">'+huChip(st.txt,st.col)+(rpOpen?' <span onclick="huJumpReports()" style="cursor:pointer" title="See the report details">'+huChip('🚩 '+rpOpen+' open report'+(rpOpen===1?'':'s')+' ›','#FF5A5A')+'</span>':'')+(huData.locked?' '+huChip('🔒 Profile locked','#9B8CFF'):'')+'</div>'
      +'</div></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">'
      +act('📨 Message','huGoMessage()','btn-primary')
      +act(hasBadge?'🏅 Edit badge':'🏅 Give badge','huBadge()')
      +act('📊 Analytics','huUserAnalytics()')
      +(email?'<a class="btn btn-ghost" style="padding:8px 14px;font-size:13px;text-decoration:none" href="mailto:'+escapeHTML(email)+'">✉️ Email</a>':'')
      +'<button class="btn btn-ghost" style="padding:8px 14px;font-size:13px" data-label="📋 Copy ID" onclick="adminCopyText(\''+uid+'\',this)">📋 Copy ID</button>'
    +'</div></div>';
  var tab=function(id,label){ return '<button class="admin-tab'+(huTab===id?' active':'')+'" onclick="huSetTab(\''+id+'\')">'+label+'</button>'; };
  var tabs='<div class="admin-tabs" style="margin-bottom:0;border-bottom:0;padding-bottom:0">'+tab('overview','Overview')+tab('edit','✏️ Edit profile')+tab('moderate','🛡️ Moderate'+(st.active||rpOpen?' •':''))+'</div>';
  var flash=huFlash?'<div style="padding:10px 12px;border-radius:10px;background:var(--surface2);font-size:13px;margin-bottom:12px;word-break:break-word">'+escapeHTML(huFlash)+'</div>':'';
  var body=(huTab==='edit')?huEditHTML(locked):(huTab==='moderate')?huModerateHTML(locked,st):huOverviewHTML(locked,st);
  huEl.innerHTML=head+'<div class="admin-card">'+tabs+'<div style="margin-top:14px">'+flash+body+'</div></div>';
  if(huTab==='overview') huLoadPosts();
}

/* Overview */
function huOverviewHTML(locked,st){
  var uid=huSel, usr=huData.user||{}, pub=huData.pub||{};
  var upd=''; if(usr.updatedAt){ var ud=new Date(usr.updatedAt); if(!isNaN(ud)) upd=ud.toLocaleString('en-GB'); }
  var b=(typeof ksBadges!=='undefined')&&ksBadges[uid], bt=b?ksBadgeType(b.type):null;
  var rep=modRep.filter(function(r){ return r.reportedUid===uid; });
  var pic=ksSafePic(pub.photoDataUrl)||ksSafePic(usr.photoDataUrl);
  var row=function(a,v){ return '<div class="ks-info-row"><span>'+a+'</span><span style="word-break:break-all;text-align:right">'+v+'</span></div>'; };
  var h=row('Display name',escapeHTML(pub.displayName||usr.displayName||'—'))
    +row('Username',pub.username?'@'+escapeHTML(pub.username):'Not chosen yet')
    +row('Email',escapeHTML(usr.email||'Not on file'))
    +row('User ID','<span style="font-family:\'Share Tech Mono\',monospace;font-size:12px">'+escapeHTML(uid)+'</span>')
    +(upd?row('Profile updated',escapeHTML(upd)):'')
    +row('Badge',bt?escapeHTML(bt.name):'None')
    +row('Standing',escapeHTML(st.txt.replace(/^[^A-Za-z0-9]+/,''))+(st.line?'<br><span style="font-size:12px;color:var(--sub)">'+escapeHTML(st.line)+'</span>':''))
    +'<div style="text-align:right;margin:-4px 0 4px"><button class="btn btn-ghost" style="padding:3px 10px;font-size:12px" onclick="huStandingHelp()">ⓘ What does standing mean?</button></div>'
    +row('Warnings',huMod?String(huMod.warns.length):'…')
    +row('Profile lock',huData.locked?'🔒 Locked — only admins can change their name, picture and username':'Not locked')
    +row('Reports against them',rep.length+' ('+rep.filter(function(r){return (r.status||'open')==='open';}).length+' open)')
    +row('Picture',pic?ueKB(pic):'None')
    +row('Privacy',(pub.isPrivate?'Private profile':'Public profile')+(pub.hideBoard?' · hidden from leaderboards':''));
  h+='<div id="huReports">'+huSecLabel('Reports against this user'+(rep.length?' ('+rep.length+')':''))+huReportsHTML(rep)+'</div>';
  h+=huSecLabel('Recent posts');
  h+='<div id="huPosts">'+huPostsHTML()+'</div>';
  return h;
}
function huPostsHTML(){
  if(huPosts===null) return '<div class="admin-empty">Loading…</div>';
  if(!huPosts.length) return '<div class="admin-empty">No community posts.</div>';
  return huPosts.slice(0,5).map(function(p){
    var d=p.createdAt&&p.createdAt.toDate?p.createdAt.toDate().toLocaleDateString('en-GB'):'';
    var t=String(p.text||''); if(t.length>160) t=t.slice(0,160)+'…';
    return '<div style="padding:10px 0;border-top:1px solid var(--border);font-size:13.5px;word-break:break-word"><div style="font-size:12px;color:var(--sub)">'+escapeHTML(d)+'</div>'+escapeHTML(t)+'</div>';
  }).join('');
}
function huLoadPosts(){
  if(huPosts!==null||huPostsBusy) return;
  if(!window.KSV2||!window.KSV2.posts){ huPosts=[]; var e0=document.getElementById('huPosts'); if(e0) e0.innerHTML=huPostsHTML(); return; }
  var uid=huSel, id=huLoadId; huPostsBusy=true;
  Promise.resolve(window.KSV2.posts(uid)).then(function(l){ if(id!==huLoadId) return; huPosts=l||[]; }).catch(function(){ if(id!==huLoadId) return; huPosts=[]; })
    .then(function(){ huPostsBusy=false; var el=document.getElementById('huPosts'); if(el&&huSel===uid) el.innerHTML=huPostsHTML(); });
}

/* Reports shown right on the profile: who reported, why, their note and the messages they submitted */
function huReportCardHTML(r){
  var a=adminPerson(r.reporterUid), st=r.status||'open';
  var d=r.createdAt&&r.createdAt.toDate?r.createdAt.toDate().toLocaleString('en-GB'):'sending…';
  var msgs=(r.messages||[]).map(function(m){ return '<div style="padding:6px 10px;margin:4px 0;border-radius:10px;background:var(--surface2);font-size:13px;word-break:break-word"><strong>'+(m.fromUid===r.reportedUid?'Reported user':'Reporter')+':</strong> '+escapeHTML(m.text||'')+'</div>'; }).join('');
  var btn=function(l,f,c){ return '<button class="btn '+(c||'btn-ghost')+'" style="padding:6px 12px;font-size:12.5px" onclick="'+f+'">'+l+'</button>'; };
  return '<div class="admin-card" style="padding:14px;margin-top:10px;'+(st==='open'?'border-color:var(--accent)':'opacity:.85')+'">'
    +'<div style="font-size:12px;color:var(--sub)">'+escapeHTML(d)+' · '+(r.kind==='dm'?'Chat report':'Profile report')+' · <strong>'+escapeHTML(r.reason||'')+'</strong> · '+escapeHTML(st)+'</div>'
    +'<div style="display:flex;align-items:center;gap:10px;margin:10px 0">'+adminAvatarHTML(a,36)
      +'<div style="min-width:0"><div style="font-size:11.5px;color:var(--sub)">Reported by</div>'
      +'<div style="font-weight:700;word-break:break-word">'+escapeHTML(a.name)+(a.username?' <span style="font-weight:400;color:var(--sub)">@'+escapeHTML(a.username)+'</span>':'')+'</div>'
      +'<div style="font-size:12px;color:var(--sub);word-break:break-all">'+escapeHTML(a.email||r.reporterUid)+'</div></div></div>'
    +(r.details?'<div style="font-size:11.5px;color:var(--sub)">Their note</div><div style="font-size:13.5px;margin:2px 0 8px;word-break:break-word">“'+escapeHTML(r.details)+'”</div>':'<div style="font-size:12.5px;color:var(--sub);margin-bottom:8px">The reporter did not write a note.</div>')
    +(msgs?'<div style="font-size:11.5px;color:var(--sub);margin-top:6px">Messages exactly as submitted by the reporter (not independently verified):</div>'+msgs:(r.kind==='dm'?'<div style="font-size:12px;color:var(--sub)">The reporter chose not to include messages.</div>':''))
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'
      +btn(st==='open'?'✔ Resolve':'↺ Reopen','modSetReport(\''+r.id+'\',\''+(st==='open'?'resolved':'open')+'\')',st==='open'?'btn-primary':'btn-ghost')
      +btn('👤 View reporter','huOpen(\''+r.reporterUid+'\')')
      +btn('🗑 Delete','modDelReport(\''+r.id+'\')')
    +'</div></div>';
}
function huReportsHTML(list){
  if(!list.length) return '<div class="admin-empty">No reports against this user.</div>';
  var uids=[]; list.forEach(function(r){ if(uids.indexOf(r.reporterUid)===-1) uids.push(r.reporterUid); });
  adminWatchUids(uids); adminLoadUnames(uids);
  var open=list.filter(function(r){ return (r.status||'open')==='open'; });
  var done=list.filter(function(r){ return (r.status||'open')!=='open'; });
  return (open.length?open.map(huReportCardHTML).join(''):'<div class="admin-empty">No open reports.</div>')
    +(done.length?'<details style="margin-top:12px"><summary style="cursor:pointer;font-size:13px;color:var(--sub)">Resolved reports ('+done.length+')</summary>'+done.map(huReportCardHTML).join('')+'</details>':'');
}
function huJumpReports(){
  huSetTab('overview');
  setTimeout(function(){ var e=document.getElementById('huReports'); if(e&&e.scrollIntoView) e.scrollIntoView({behavior:'smooth',block:'start'}); },60);
}
function huStandingHelp(){
  ksAlert('Standing is a quick label for this person\'s record:\n\n'
    +'✅ Good standing — no active ban and no warnings on record.\n\n'
    +'⚠️ Warnings — you have sent them one or more warnings (they stay on their record). It is only a label; it does not restrict anything by itself.\n\n'
    +'🚫 Banned — an active ban. Temporary bans show the end date. They can still read the app but cannot post, message or save public changes, and the ban follows their email address. When a temporary ban ends, the label goes back to warnings or good standing.\n\n'
    +'Warnings and bans are handled in the Moderate tab.');
}

/* Message + badge shortcuts (reuse the existing flows) */
function huGoMessage(){ var uid=huSel; adminTab='chats'; adminChatInfo=false; adminInfoFrom='chat'; adminSetView('inbox'); setTimeout(function(){ if(typeof adminOpenChat==='function') adminOpenChat(uid); },0); }
function huBadge(){ if(huSel) adminBadgeChoose(huSel); }

/* Edit profile */
function huEditHTML(locked){
  var uid=huSel, usr=huData.user||{}, d=huDraft, pic=huPic(), nm=(d.name||'').trim();
  var dis=(locked||huSaving)?' disabled':'';
  var lab='font-size:11.5px;font-weight:700;letter-spacing:.05em;color:var(--sub);margin:16px 0 6px;text-transform:uppercase';
  var btn=function(l,f){ return '<button class="btn btn-ghost" style="padding:6px 14px;font-size:12.5px"'+dis+' onclick="'+f+'">'+l+'</button>'; };
  return (locked?'<p style="color:var(--muted);font-size:13px;margin:0 0 10px">🔒 This is an admin account, so it can\'t be edited from here.</p>':'')
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:2px 0 4px">'+huAvatar(pic,nm,96,huSel)
      +(pic?'<div style="font-size:12px;color:var(--sub)">Picture size: '+ueKB(pic)+(pic.length>=UE_SHRINK_MIN?' (can be shrunk)':' (already small)')+'</div>':'')
      +(locked?'':'<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">'
        +btn('📷 Change picture','document.getElementById(\'uePhotoFile\').click()')
        +(pic?btn('🗑️ Remove','uePhotoRemove()'):'')
        +(pic&&pic.length>=UE_SHRINK_MIN?btn('🗜️ Shrink to '+UE_PIC_PX+'×'+UE_PIC_PX,'uePhotoShrink()'):'')
        +(d.photo!==undefined?btn('↩ Undo','uePhotoUndo()'):'')
      +'</div><input type="file" accept="image/*" id="uePhotoFile" style="display:none" onchange="uePhotoPick(this)">')
    +'</div>'
    +'<div style="'+lab+'">Display name</div><input class="ks-input" id="ueName" maxlength="40" autocomplete="off" value="'+escapeHTML(d.name)+'"'+dis+'>'
    +'<div style="'+lab+'">Username</div><input class="ks-input" id="ueUser" maxlength="20" autocomplete="off" autocapitalize="off" placeholder="no username" value="'+escapeHTML(d.username)+'"'+dis+'>'
    +'<div style="font-size:11.5px;color:var(--sub);margin-top:5px">3–20 letters, numbers or underscores. Leave empty to remove it. Taken or reserved names are refused.</div>'
    +'<div style="'+lab+'">Privacy switches</div>'
    +'<label style="display:flex;align-items:center;gap:10px;padding:6px 0;font-size:14px"><input type="checkbox" id="uePriv"'+(d.isPrivate?' checked':'')+dis+'> Private profile (follows need approval)</label>'
    +'<label style="display:flex;align-items:center;gap:10px;padding:6px 0;font-size:14px"><input type="checkbox" id="ueBoard"'+(d.hideBoard?' checked':'')+dis+'> Hide from leaderboards</label>'
    +(locked?'':'<div style="'+lab+'">Profile lock</div>'
      +'<label style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:14px"><input type="checkbox" id="ueLock" style="margin-top:3px"'+(d.lock?' checked':'')+dis+'> <span>🔒 Lock this profile — the user can no longer change their name, picture or username (only admins can)</span></label>'
      +'<div style="font-size:11.5px;color:var(--sub);margin-top:2px">Leave it off and the user can still edit their own profile as normal. Their privacy switches stay theirs either way. You can unlock any time.</div>'
      +(huData.lockErr?'<div style="font-size:11.5px;color:#F5B042;margin-top:4px">Could not check the lock — publish the updated Firestore rules first.</div>':''))
    +(locked?'':'<div style="'+lab+'">Reason (optional)</div>'
      +'<textarea class="ks-input" id="ueReason" rows="2" maxlength="150" placeholder="e.g. Username broke the community guidelines" style="resize:vertical">'+escapeHTML(d.reason||'')+'</textarea>'
      +'<label style="display:flex;align-items:center;gap:10px;padding:10px 0 0;font-size:14px"><input type="checkbox" id="ueNotify"'+(d.notify?' checked':'')+dis+'> Tell them in an official message</label>'
      +'<button class="btn btn-primary" style="margin-top:16px;width:100%"'+dis+' onclick="huSave()">'+(huSaving?'Saving…':'Save changes')+'</button>')
    +'<div style="font-size:11.5px;color:var(--sub);margin-top:14px">The email address belongs to the sign-in system, so only the account owner (or the Firebase console) can change it.</div>';
}
function uePhotoPick(inp){
  var f=inp&&inp.files&&inp.files[0]; if(!f) return;
  if(!/^image\//.test(f.type)){ ksAlert('Please choose an image file.'); return; }
  if(f.size>15*1024*1024){ ksAlert('That image is too large (15 MB max).'); return; }
  var url=URL.createObjectURL(f), img=new Image();
  img.onload=function(){
    try{
      var side=Math.min(img.width,img.height); if(!side) throw 0;
      var c=document.createElement('canvas'); c.width=UE_PIC_PX; c.height=UE_PIC_PX;
      c.getContext('2d').drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,UE_PIC_PX,UE_PIC_PX);
      var out=c.toDataURL('image/jpeg',UE_PIC_Q);
      URL.revokeObjectURL(url);
      huReadDraft(); huDraft.photo=out; huRenderProfile();
    }catch(e){ URL.revokeObjectURL(url); ksAlert('Could not read that image.'); }
  };
  img.onerror=function(){ URL.revokeObjectURL(url); ksAlert('Could not read that image.'); };
  img.src=url;
}
function uePhotoShrink(){
  var p=huPic(); if(!p) return;
  ueShrinkDataUrl(p).then(function(small){
    if(!small){ ksAlert('This picture is already as small as it gets.'); return; }
    huReadDraft(); huDraft.photo=small; huRenderProfile();
  });
}
function uePhotoRemove(){ huReadDraft(); huDraft.photo=null; huRenderProfile(); }
function uePhotoUndo(){ huReadDraft(); huDraft.photo=undefined; huRenderProfile(); }
function ueNormUser(s){ return String(s||'').trim().toLowerCase().replace(/^@/,''); }
function huSave(){
  if(huSaving||!huData||!huSel) return;
  huReadDraft();
  var uid=huSel, usr=huData.user||{}, pub=huData.pub||{}, d=huDraft, K=window.KSFirebase;
  if(ueIsAdminUid(uid)) return;
  if(!K||!K.adminEditUserProfile){ ksAlert('Still connecting — try again in a moment.'); return; }
  var ch={}, lines=[];
  var name=String(d.name||'').trim();
  if(!name){ ksAlert('Display name cannot be empty.'); return; }
  var oldName=pub.displayName||usr.displayName||'';
  if(name!==oldName){ ch.displayName=name; lines.push('Name: “'+oldName+'” → “'+name+'”'); }
  var nu=ueNormUser(d.username), ou=pub.username||'';
  if(nu!==ou){
    if(nu&&!/^[a-z0-9_]{3,20}$/.test(nu)){ ksAlert('Usernames are 3–20 letters, numbers or underscores.'); return; }
    if(nu&&UE_RESERVED.indexOf(nu)!==-1){ ksAlert('That username is reserved.'); return; }
    ch.username=nu; lines.push('Username: '+(ou?'@'+ou:'none')+' → '+(nu?'@'+nu:'none'));
  }
  if(d.photo!==undefined){ ch.photoDataUrl=d.photo; lines.push(d.photo===null?'Picture: remove':'Picture: replace'); }
  if(!!d.isPrivate!==!!pub.isPrivate){ ch.isPrivate=!!d.isPrivate; lines.push('Private profile: '+(d.isPrivate?'on':'off')); }
  if(!!d.hideBoard!==!!pub.hideBoard){ ch.hideBoard=!!d.hideBoard; lines.push('Hidden from leaderboards: '+(d.hideBoard?'yes':'no')); }
  if(!!d.lock!==!!huData.locked){ ch.lock=!!d.lock; lines.push('Profile lock: '+(d.lock?'ON — the user can no longer edit their name, picture or username':'off — the user can edit again')); }
  if(!lines.length){ ksAlert('Nothing to save — you haven\'t changed anything.'); return; }
  var reason=String(d.reason||'').trim().slice(0,150); if(reason) ch.note=reason;
  ksAsk('Apply these changes to this account?\n\n'+lines.join('\n'),function(){
    huSaving=true; huRenderProfile();
    K.adminEditUserProfile(uid,ch).then(function(r){
      huSaving=false;
      if(!r||!r.changed){ huFlash='Nothing needed saving.'; if(huSel===uid) huRenderProfile(); return; }
      var what=r.what.join(', ');
      var done=function(){
        K.adminGetUserFull(uid).then(function(f){
          huData=f; if(f.user) adminUsers[uid]=Object.assign({},adminUsers[uid]||{},f.user);
          adminUnames[uid]=(f.pub&&f.pub.username)||'';
          if(huSel===uid){ huResetDraft(); huFlash='✅ Saved ('+what+').'; huRenderProfile(); }
        }).catch(function(){ if(huSel===uid){ huFlash='✅ Saved ('+what+').'; huRenderProfile(); } });
      };
      if(d.notify&&K.sendInboxMessage){
        var wl=r.what.filter(function(x){ return !/^profile (un)?locked$/.test(x); });
        var msg=((wl.length?'The Alio team updated your profile ('+wl.join(', ')+').':'The Alio team updated your profile settings.')+(ch.lock===true?' Your profile is now locked, so only the team can change your name, picture and username.':'')+(ch.lock===false?' You can edit your profile yourself again.':'')+(reason?' Reason: '+reason:'')).slice(0,1000);
        K.sendInboxMessage(uid,msg).then(done).catch(done);
      } else done();
    }).catch(function(err){
      huSaving=false; if(huSel===uid) huRenderProfile();
      var m=ueMsg(err);
      if(/permission|insufficient/i.test(m)) m='The database refused this change. Publish the updated Firestore rules (firestore.txt), then try again.';
      ksAlert('Could not save: '+m);
    });
  },{okText:'Save changes',title:'Edit this profile?'});
}

/* Moderate */
function huModerateHTML(locked,st){
  if(locked) return '<p class="admin-empty">Admin accounts can\'t be moderated here.</p>';
  var i=huMod;
  if(!i) return '<p class="admin-empty" style="'+(huModErr?'color:#FF5A5A':'')+'">'+(huModErr?'Could not load. Check your connection and that the new rules are published.':'Loading…')+'</p>';
  var u=huSel, em=huEmail(), btn=function(l,f){ return '<button class="btn btn-primary" style="padding:8px 16px;font-size:13px" onclick="'+f+'">'+l+'</button>'; };
  var h='<div class="ks-info-row"><span>Standing</span><span style="text-align:right">'+escapeHTML(st.txt)+(st.line?'<br><span style="font-size:12px;color:var(--sub)">'+escapeHTML(st.line)+'</span>':'')+'</span></div>'
    +'<div class="ks-info-row"><span>Warnings</span><span>'+i.warns.length+'</span></div>'
    +huSecLabel('⚠️ Send a warning')
    +'<textarea class="ks-input" id="huWarnText" rows="3" maxlength="500" placeholder="What did they do wrong? This text is shown to the user." style="width:100%"></textarea>'
    +'<div style="margin-top:8px">'+btn('Send warning','huWarn()')+'</div>'
    +huSecLabel('🚫 Ban');
  h+=st.active?'<div>'+btn('Lift ban','huUnban()')+'</div>'
    :'<select class="ks-input" id="huDur" style="width:100%;margin-bottom:8px"><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="30">30 days</option><option value="perm">Permanent</option></select>'
     +'<textarea class="ks-input" id="huBanReason" rows="2" maxlength="300" placeholder="Reason (shown to the user)" style="width:100%"></textarea>'
     +'<div style="margin-top:8px">'+btn('Ban user','huBan()')+'</div>'
     +'<div style="font-size:12px;color:var(--sub);margin-top:6px">'+(em?'Bans the account and its email address.':'No email on file — only the account ID will be banned.')+'</div>';
  h+=huSecLabel('Warning history')+(i.warns.length?i.warns.slice(0,10).map(function(w){
    return '<div style="font-size:13px;padding:8px 0;border-top:1px solid var(--border);word-break:break-word">'+escapeHTML(w.createdAt&&w.createdAt.toDate?w.createdAt.toDate().toLocaleDateString('en-GB'):'')+' · '+(w.acknowledged?'acknowledged':'not yet seen')+'<br>'+escapeHTML(w.text||'')+'</div>';
  }).join(''):'<div class="admin-empty">No warnings.</div>');
  h+='<div style="text-align:right;margin-top:10px"><button class="btn btn-ghost" style="padding:3px 10px;font-size:12px" onclick="huStandingHelp()">ⓘ What does standing mean?</button></div>';
  h+=huSecLabel('Reports against this user')+huReportsHTML(modRep.filter(function(r){ return r.reportedUid===u; }));
  return h;
}
function huModAct(p,ok){
  var uid=huSel; huFlash='';
  return p.then(function(){
    huFlash=ok; huMod=null; huRenderProfile();
    return window.KSFirebase.adminGetModeration(uid,huEmail()).then(function(m){ if(huSel===uid){ huMod=m; huRenderProfile(); } });
  }).catch(function(e){ huFlash='Failed: '+ueMsg(e); if(huSel===uid) huRenderProfile(); });
}
function huWarn(){
  var el=document.getElementById('huWarnText'), t=(el&&el.value||'').trim();
  if(!t){ ksAlert('Write the warning first.'); return; }
  ksAsk('Send this warning?',function(){ huModAct(window.KSFirebase.adminWarn(huSel,t),'Warning sent.'); },{okText:'Send warning',danger:false,title:'Send warning?'});
}
function huBan(){
  var d=document.getElementById('huDur').value, r=(document.getElementById('huBanReason').value||'').trim();
  if(!r){ ksAlert('Please give a reason.'); return; }
  ksAsk('Ban this user'+(d==='perm'?' PERMANENTLY':' for '+d+' day(s)')+'?',function(){
    huModAct(window.KSFirebase.adminBan(huSel,huEmail(),d==='perm'?'permanent':'temp',Date.now()+(+d||0)*864e5,r),'User banned.');
  },{okText:'Ban user',title:'Ban user?'});
}
function huUnban(){
  ksAsk('Lift this ban?',function(){
    huModAct(window.KSFirebase.adminUnban(huSel,(huMod&&huMod.ban&&huMod.ban.email)||huEmail()),'Ban lifted.');
  },{okText:'Lift ban',danger:false,title:'Lift ban?'});
}

/* ── Feature flags panel ── */
function renderAdminAppFeaturesHtml(){
  var totalOn=0,totalOff=0;
  var groups=FEATURE_CATALOG.map(function(g){
    var groupOff=0;
    var rows=g.items.map(function(it){
      var on=!(adminFeatureFlags && adminFeatureFlags[it.key]===false); // default: enabled unless explicitly paused
      if(on) totalOn++; else { totalOff++; groupOff++; }
      return '<div class="admin-flag-row" data-state="'+(on?'on':'off')+'" data-name="'+escapeHTML((it.label+' '+(it.desc||'')+' '+(it.kw||'')+' '+g.group+' '+it.key.replace(/_/g,' ')).toLowerCase())+'">'
        +'<span class="admin-flag-name">'+escapeHTML(it.label)+(it.desc?'<small>'+escapeHTML(it.desc)+'</small>':'')+'</span>'
        +'<span class="admin-badge '+(on?'live':'off')+'">'+(on?'LIVE':'PAUSED')+'</span>'
        +'<label class="ks-switch"><input type="checkbox" '+(on?'checked':'')+' onchange="adminToggleCatalogFlag(\''+it.key+'\',this.checked)"><span class="ks-switch-track"></span></label>'
      +'</div>';
    }).join('');
    return '<div class="admin-flag-group" data-group="'+escapeHTML(g.group.toLowerCase())+'"><h4 class="admin-flag-group-title">'+escapeHTML(g.group)+(groupOff?'<span class="admin-flag-group-count">'+groupOff+' paused</span>':'')+'</h4><div class="admin-flag-list">'+rows+'</div></div>';
  }).join('');
  function chip(f,label,n,cls){
    return '<button type="button" class="admin-ff-chip '+cls+(n?' has':'')+(adminFeatureFilter===f?' active':'')+'" onclick="adminSetFeatureFilter(\''+f+'\')">'+label+' <b>'+n+'</b></button>';
  }
  return '<div class="admin-card">'
    +'<div class="admin-card-head"><h3>App Features</h3></div>'
    +'<p style="color:var(--sub);font-size:12px;margin-bottom:14px">Turn any game, tool, section, theme, colour, setting or small part of the interface off for every visitor, instantly, without touching anything else. Flip it back on the same way. As admin you always see everything, so you can still manage it. The About, Privacy Policy, Terms and Community Guidelines pages are always available and cannot be switched off. Switches for Community, Inbox and PDF Toolkit are also enforced by the database rules; the rest hide the feature inside the app.</p>'
    +'<div style="position:relative;margin-bottom:16px">'
      +'<span style="position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none">🔍</span>'
      +'<input class="ks-input" id="adminFeatureSearch" placeholder="Search any feature — typos are fine (try: delet post, hard sudku)" value="'+escapeHTML(adminFeatureQuery)+'" oninput="adminFilterFeatures(this.value)" style="padding-left:44px;">'
    +'</div>'
    +'<div class="admin-ff-bar">'+chip('all','All',totalOn+totalOff,'all')+chip('off','⏸ Paused (off)',totalOff,'paused')+chip('on','✅ Live (on)',totalOn,'live')+'</div>'
    +'<div id="adminFeatureGroups">'+groups+'</div>'
    +'<p id="adminFeatureNoMatch" style="display:none;text-align:center;padding:20px;color:var(--muted);font-size:14px">😕 No matching feature found.</p>'
  +'</div>';
}
// Filters the App Features rows by label text as the admin types. Hides a
// whole group heading when every row inside it is filtered out, so search
// results don't leave empty "Games" / "Health tools" headers floating around.
function adminFilterFeatures(query){
  if(typeof query==='string') adminFeatureQuery=query;
  var q=(adminFeatureQuery||'').toLowerCase().trim();
  var f=adminFeatureFilter;
  var groups=document.querySelectorAll('#adminFeatureGroups .admin-flag-group');
  var anyVisible=false;
  groups.forEach(function(group){
    var rows=group.querySelectorAll('.admin-flag-row');
    var groupHasMatch=false;
    rows.forEach(function(row){
      var match=(!q||ksFuzzyMatch(q,row.dataset.name)) && (f==='all'||row.dataset.state===f);
      row.style.display=match?'':'none';
      if(match){ groupHasMatch=true; anyVisible=true; }
    });
    group.style.display=groupHasMatch?'':'none';
  });
  var noMatch=document.getElementById('adminFeatureNoMatch');
  if(noMatch){
    noMatch.textContent=(f==='off'&&!q)?'🎉 Nothing is paused — every feature is live.'
      :(f==='on'&&!q)?'No features are live right now.'
      :'😕 No matching feature found.';
    noMatch.style.display=anyVisible?'none':'block';
  }
}
// Switches the App Features list between All / only Paused (off) / only Live (on).
function adminSetFeatureFilter(f){
  adminFeatureFilter=f;
  document.querySelectorAll('.admin-ff-chip').forEach(function(c){
    var m=/adminSetFeatureFilter\('(\w+)'\)/.exec(c.getAttribute('onclick')||'');
    c.classList.toggle('active',!!m&&m[1]===f);
  });
  adminFilterFeatures();
}
function adminToggleCatalogFlag(key,val){
  window.KSFirebase.setFeatureFlag(key,val).catch(function(err){
    ksAlert('Could not update: '+(err&&err.message?err.message:err));
  });
}
// Emergency Site Pause (added) — a deliberately separate, extra-confirmed
// path from adminToggleCatalogFlag: this one flag takes the whole app
// offline for every non-admin visitor, so turning it ON always requires an
// explicit confirmation. Turning it OFF does not — that's the "undo".
function adminToggleMaintenance(checkbox){
  var checked=checkbox.checked;
  if(checked){ checkbox.checked=false; ksAsk('This takes the ENTIRE site offline for every visitor right now — they will see a maintenance page instead of the app. You will still have full access as admin. Continue?',function(){ checkbox.checked=true; adminApplyMaintenance(checkbox,true); },{okText:'Take site offline',title:'Take the whole site offline?'}); return; }
  adminApplyMaintenance(checkbox,false);
}
function adminApplyMaintenance(checkbox,checked){
  window.KSFirebase.setFeatureFlag('app_maintenance',checked).then(function(){
    var label=document.querySelector('.admin-maintenance-label');
    if(label) label.textContent=checked?'🔴 SITE IS PAUSED':'🟢 Site is live';
  }).catch(function(err){
    ksAlert('Could not update: '+(err&&err.message?err.message:err));
    checkbox.checked=!checked;
  });
}
function renderAdminFlagsPanel(el){
  el.innerHTML='<div class="admin-card"><p style="color:var(--muted)">Loading feature flags…</p></div>';
  adminFlagsUnsub=window.KSFirebase.subscribeFeatureFlags(function(flags,err){
    if(err){ el.innerHTML=adminErrorHtml(err); return; }
    adminFeatureFlags=flags||{};
    var catalogKeys={'app_maintenance':true}; FEATURE_CATALOG.forEach(function(g){ g.items.forEach(function(it){ catalogKeys[it.key]=true; }); });
    var keys=Object.keys(adminFeatureFlags).filter(function(k){ return !catalogKeys[k]; }).sort();
    var rows=keys.map(function(k){
      var on=!!adminFeatureFlags[k];
      return '<div class="admin-flag-row">'
        +'<span class="admin-flag-name">'+escapeHTML(k)+'</span>'
        +'<span class="admin-badge '+(on?'live':'off')+'">'+(on?'ON':'OFF')+'</span>'
        +'<label class="ks-switch"><input type="checkbox" '+(on?'checked':'')+' onchange="adminToggleFlag(\''+encodeURIComponent(k)+'\',this.checked)"><span class="ks-switch-track"></span></label>'
        +'<button class="btn btn-ghost admin-flag-del" onclick="adminDeleteFlag(\''+encodeURIComponent(k)+'\')" title="Delete flag" aria-label="Delete flag">🗑</button>'
      +'</div>';
    }).join('');
    var maintOn = adminFeatureFlags && adminFeatureFlags.app_maintenance===true;
    el.innerHTML=renderAdminAppFeaturesHtml()
    +'<div class="admin-card">'
      +'<div class="admin-card-head"><h3>Custom Flags</h3><span class="admin-count">'+keys.length+'</span></div>'
      +(keys.length?'<div class="admin-flag-list">'+rows+'</div>':'<p class="admin-empty">No custom flags yet — for advanced/one-off use. The toggles above already cover every game, tool and section.</p>')
      +'<p style="color:var(--sub);font-size:12px;margin-top:10px">Synced live via onSnapshot — toggling a switch above updates every connected visitor instantly.</p>'
    +'</div>'
    +'<div class="admin-card">'
      +'<div class="admin-card-head"><h3>New custom flag</h3></div>'
      +'<label class="field-label">Flag key</label>'
      +'<input class="ks-input mt-sm" id="adminNewFlagKey" placeholder="e.g. new_dashboard_ui" maxlength="40" autocomplete="off" '
        +'oninput="adminValidateFlagKeyInput()" onkeydown="if(event.key===\'Enter\'){event.preventDefault();adminAddFlag();}">'
      +'<p class="helper-txt" id="adminFlagKeyHelp" style="display:block;color:var(--sub)">Lowercase letters, numbers, and underscores only — must start with a letter (2–40 characters).</p>'
      +'<button class="btn btn-primary mt-sm" id="adminAddFlagBtn" onclick="adminAddFlag()" disabled>Add flag</button>'
    +'</div>'
    +'<div class="admin-card admin-maintenance-card">'
      +'<div class="admin-card-head"><h3>🔴 Emergency Site Pause</h3></div>'
      +'<p style="color:var(--sub);font-size:12px;margin-bottom:14px">Takes the <b>entire site</b> offline for every visitor immediately — they\'ll see a maintenance page instead of the app. You stay signed in as admin and can flip it back off from right here.</p>'
      +'<div class="admin-maintenance-row">'
        +'<span class="admin-maintenance-label">'+(maintOn?'🔴 SITE IS PAUSED':'🟢 Site is live')+'</span>'
        +'<label class="ks-switch ks-switch-danger"><input type="checkbox" '+(maintOn?'checked':'')+' onchange="adminToggleMaintenance(this)"><span class="ks-switch-track"></span></label>'
      +'</div>'
    +'</div>';
    adminFilterFeatures(); // keep the chosen filter + search after every live update
  });
}
// Live validation as the admin types — normalizes to a safe snake_case key,
// rejects anything that doesn't match ADMIN_FLAG_KEY_RE or already exists,
// and keeps the submit button disabled until the key is actually valid. This
// replaces the old behavior of silently stripping bad characters with no
// feedback, which is how gibberish/partial keys were getting created.
function adminValidateFlagKeyInput(){
  var inp=document.getElementById('adminNewFlagKey');
  var help=document.getElementById('adminFlagKeyHelp');
  var btn=document.getElementById('adminAddFlagBtn');
  if(!inp||!help||!btn) return false;
  var raw=inp.value;
  var norm=raw.trim().toLowerCase().replace(/\s+/g,'_');
  var valid=ADMIN_FLAG_KEY_RE.test(norm);
  var dup=valid && Object.prototype.hasOwnProperty.call(adminFeatureFlags,norm);
  inp.classList.toggle('err', raw.length>0 && !valid);
  if(!raw.length){
    help.textContent='Lowercase letters, numbers, and underscores only — must start with a letter (2–40 characters).';
    help.style.color='var(--sub)';
  }else if(!valid){
    help.textContent='Invalid key — use lowercase letters, numbers, and underscores, starting with a letter.';
    help.style.color='#FF5A5A';
  }else if(dup){
    help.textContent='A flag named "'+norm+'" already exists.';
    help.style.color='#FF5A5A';
  }else{
    help.textContent='Will be added as: '+norm;
    help.style.color='#22C58B';
  }
  btn.disabled=!(valid && !dup);
  return valid && !dup;
}
function adminToggleFlag(keyEnc,val){
  window.KSFirebase.setFeatureFlag(decodeURIComponent(keyEnc),val).catch(function(err){
    ksAlert('Could not update flag: '+(err&&err.message?err.message:err));
  });
}
function adminDeleteFlag(keyEnc){
  var key=decodeURIComponent(keyEnc);
  ksAsk('Delete flag "'+key+'"? This cannot be undone.',function(){
  window.KSFirebase.deleteFeatureFlag(key).catch(function(err){
    ksAlert('Could not delete flag: '+(err&&err.message?err.message:err));
  });
},{okText:'Delete flag',title:'Delete flag?'});}
function adminAddFlag(){
  var inp=document.getElementById('adminNewFlagKey');
  if(!inp) return false;
  if(!adminValidateFlagKeyInput()) return false; // re-validates + refreshes the helper text/disabled state
  var key=inp.value.trim().toLowerCase().replace(/\s+/g,'_');
  var btn=document.getElementById('adminAddFlagBtn');
  if(btn) btn.disabled=true;
  window.KSFirebase.setFeatureFlag(key,false).then(function(){
    inp.value='';
    adminValidateFlagKeyInput();
  }).catch(function(err){
    ksAlert('Could not add flag: '+(err&&err.message?err.message:err));
    if(btn) btn.disabled=false;
  });
  return false;
}

/* ── Announcements panel ── */
function renderAdminAnnouncementsPanel(el){
  el.innerHTML='<div class="admin-card"><p style="color:var(--muted)">Loading announcements…</p></div>';
  adminAnnUnsub=window.KSFirebase.subscribeAnnouncements(function(list,err){
    if(err){ el.innerHTML=adminErrorHtml(err); return; }
    adminAnnouncements=list||[];
    var items=adminAnnouncements.map(function(a){
      var live=a.active!==false;
      return '<div class="admin-ann-item">'
        +'<h4>'+escapeHTML(a.title||'(untitled)')+'</h4>'
        +'<p>'+escapeHTML(a.body||'')+'</p>'
        +'<div class="admin-ann-meta">'
          +'<span class="admin-badge '+(live?'live':'off')+'">'+(live?'LIVE':'HIDDEN')+'</span>'
          +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminToggleAnnouncement(\''+a.id+'\','+(!live)+')">'+(live?'Hide':'Show')+'</button>'
          +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminEditAnnouncementPrompt(\''+a.id+'\')">Edit</button>'
          +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminDeleteAnnouncement(\''+a.id+'\')">Delete</button>'
        +'</div>'
      +'</div>';
    }).join('');
    el.innerHTML='<div class="admin-card">'
      +'<div class="admin-card-head"><h3>Announcements</h3><span class="admin-count">'+adminAnnouncements.length+'</span></div>'
      +(adminAnnouncements.length?items:'<p class="admin-empty">No announcements yet.</p>')
    +'</div>'
    +'<div class="admin-card">'
      +'<div class="admin-card-head"><h3>New announcement</h3></div>'
      +'<label class="field-label">Title</label>'
      +'<input class="ks-input mt-sm" id="adminAnnTitle" placeholder="e.g. Scheduled maintenance" style="margin-bottom:12px">'
      +'<label class="field-label">Message</label>'
      +'<textarea class="ks-input" id="adminAnnBody" rows="3" placeholder="Details for visitors…" style="margin-bottom:12px;resize:vertical"></textarea>'
      +'<button class="btn btn-primary" onclick="adminCreateAnnouncement()">Publish</button>'
    +'</div>';
  });
}
function adminCreateAnnouncement(){
  var titleEl=document.getElementById('adminAnnTitle'), bodyEl=document.getElementById('adminAnnBody');
  var title=(titleEl&&titleEl.value||'').trim().slice(0,120);
  var body=(bodyEl&&bodyEl.value||'').trim().slice(0,2000);
  if(!title||!body){ ksAlert('Please fill in both a title and a message.'); return; }
  window.KSFirebase.createAnnouncement({title:title,body:body,active:true}).then(function(){
    if(titleEl) titleEl.value=''; if(bodyEl) bodyEl.value='';
  }).catch(function(err){ ksAlert('Could not publish: '+(err&&err.message?err.message:err)); });
}
function adminToggleAnnouncement(id,active){
  window.KSFirebase.updateAnnouncement(id,{active:active}).catch(function(err){
    ksAlert('Could not update: '+(err&&err.message?err.message:err));
  });
}
function adminEditAnnouncementPrompt(id){
  var a=adminAnnouncements.find(function(x){return x.id===id;}); if(!a) return;
  ksPrompt('Edit announcement text:',a.body||'',function(newBody){ newBody=(newBody||'').trim().slice(0,2000);
  if(!newBody){ ksAlert('Message cannot be empty.'); return; }
  window.KSFirebase.updateAnnouncement(id,{body:newBody}).catch(function(err){
    ksAlert('Could not save: '+(err&&err.message?err.message:err));
  });
},{title:'Edit announcement',multiline:true,okText:'Save',maxLength:2000});}
function adminDeleteAnnouncement(id){
  ksAsk('Delete this announcement? This cannot be undone.',function(){
  window.KSFirebase.deleteAnnouncement(id).catch(function(err){
    ksAlert('Could not delete: '+(err&&err.message?err.message:err));
  });
},{okText:'Delete',title:'Delete announcement?'});}


/* ── Admin: official Alio community posts ──
   Posts made here appear in Community as "Alio" with the gold official badge, no matter which
   admin writes them. An admin's own posts from the Community page keep their name + Admin tag. */
function renderAdminCommunityPanel(el){
  ksStartAliCfg();
  el.innerHTML=adminAliTextCard()+'<div class="admin-card">'
    +'<div class="admin-card-head"><h3>Post as Alio</h3></div>'
    +'<p style="color:var(--muted);font-size:13.5px;margin:0 0 14px">This message will appear in Community as <b>Alio</b> with the special Alio official badge — not under your personal account. Your own posts from the Community page still show your name and the Admin tag.</p>'
    +'<div style="font-size:11.5px;font-weight:700;letter-spacing:.05em;color:var(--sub);margin-bottom:6px">FLAIR</div>'
    +'<button type="button" class="community-flare-pick chosen" id="adminOffFlareBtn" onclick="ksFlareOpen(\'admin\')" style="margin-bottom:12px"></button>'
    +'<textarea class="ks-input" id="adminOffText" rows="4" maxlength="'+COMMUNITY_MAX_LEN+'" placeholder="Write an official message…" style="resize:vertical;margin-bottom:6px" oninput="adminOffPreview()"></textarea>'
    +'<div id="adminOffCount" style="font-size:11.5px;color:var(--sub);text-align:right;margin-bottom:12px">0 / '+COMMUNITY_MAX_LEN+'</div>'
    +'<div style="font-size:11.5px;font-weight:700;letter-spacing:.05em;color:var(--sub);margin-bottom:6px">PREVIEW</div>'
    +'<div class="community-feed" id="adminOffPreview"></div>'
    +'<button class="btn btn-primary" id="adminOffBtn" style="margin-top:14px" onclick="adminOffPost()">Post as Alio</button>'
  +'</div>'
  +'<div class="admin-card">'
    +'<div class="admin-card-head"><h3>Recent official posts</h3><span class="admin-count" id="adminOffN"></span></div>'
    +'<p style="color:var(--muted);font-size:12.5px;margin:0 0 10px">Official posts can only be edited, pinned or deleted here. In Community their ⋮ menu only shows Info and Profile, for everyone.</p>'
    +'<div id="adminOffList"><p class="admin-empty">Loading…</p></div>'
  +'</div>';
  adminOffFlareBtn();
  adminOffPreview();
  adminOffLoad();
}
function adminOffFlareBtn(){
  var b=document.getElementById('adminOffFlareBtn'); if(!b) return;
  var f=ksFlareById(adminOffFlare);
  b.innerHTML=f?(f.e+' '+escapeHTML(f.n)+' <span aria-hidden="true">▾</span>'):'🏷️ No flair (tap to choose) <span aria-hidden="true">▾</span>';
}
function adminOffPreview(){
  var ta=document.getElementById('adminOffText'), pv=document.getElementById('adminOffPreview'), ct=document.getElementById('adminOffCount');
  if(!ta||!pv) return;
  var t=ta.value;
  if(ct) ct.textContent=t.length+' / '+COMMUNITY_MAX_LEN;
  var logo=aliOfficialPic();
  pv.innerHTML='<div class="community-post"><div class="community-avatar">'+(logo?'<img src="'+logo+'" alt="">':'A')+'</div>'
    +'<div class="community-post-body"><div class="community-post-head"><span class="community-post-name">'+escapeHTML(aliOfficialName())+'</span>'+communityOfficialBadgeHTML()+'<span class="community-post-time">just now</span></div>'
    +(adminOffFlare?'<div>'+communityFlareTagHTML({flare:adminOffFlare})+'</div>':'')
    +'<div class="community-post-text">'+(t.trim()?escapeHTML(t):'<span style="color:var(--sub)">Your message will appear here…</span>')+'</div></div></div>';
}
function adminOffLoad(){
  if(!window.KSFirebase||!window.KSFirebase.getOfficialPosts) return;
  window.KSFirebase.getOfficialPosts().then(function(list){
    adminOffPosts=list;
    var box=document.getElementById('adminOffList'), n=document.getElementById('adminOffN');
    if(!box) return;
    if(n) n.textContent=list.length;
    if(!list.length){ box.innerHTML='<p class="admin-empty">No official posts yet.</p>'; return; }
    box.innerHTML=list.map(function(x){
      return '<div class="admin-ann-item"><p style="margin:0 0 6px;white-space:pre-wrap">'+escapeHTML(x.text||'')+'</p>'
        +'<div class="admin-ann-meta"><span style="font-size:11.5px;color:var(--sub)">'+(ksFlareById(x.flare)?ksFlareById(x.flare).e+' '+escapeHTML(ksFlareById(x.flare).n)+' · ':'')+escapeHTML(communityTimeAgo(x.createdAt))+(x.edited?' · edited':'')+(x.pinned?' · 📌 pinned':'')+'</span>'
        +'<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminOffEdit(\''+x.id+'\')">Edit</button>'
        +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminOffPin(\''+x.id+'\','+(!x.pinned)+')">'+(x.pinned?'Unpin':'📌 Pin')+'</button>'
        +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminOffDelete(\''+x.id+'\')">Delete</button></span></div></div>';
    }).join('');
  }).catch(function(err){
    var box=document.getElementById('adminOffList');
    if(box) box.innerHTML='<p class="admin-empty">Could not load official posts right now.</p>';
  });
}
function adminOffPost(){
  if(adminOffBusy) return;
  var ta=document.getElementById('adminOffText'); if(!ta) return;
  var text=ta.value.trim().slice(0,COMMUNITY_MAX_LEN);
  if(!text){ ksAlert('Please write a message first.'); return; }
  ksAsk('Post this to Community as the official Alio account? Everyone will see it.',function(){
  if(!window.KSFirebase||!window.KSFirebase.postOfficialCommunityMessage){ ksAlert('Still connecting — try again in a moment.'); return; }
  adminOffBusy=true;
  var btn=document.getElementById('adminOffBtn'); if(btn){ btn.disabled=true; btn.textContent='Posting…'; }
  window.KSFirebase.postOfficialCommunityMessage(text,adminOffFlare).then(function(){
    adminOffBusy=false;
    var t=document.getElementById('adminOffText'); if(t) t.value='';
    var b=document.getElementById('adminOffBtn'); if(b){ b.disabled=false; b.textContent='Post as Alio'; }
    adminOffPreview(); adminOffLoad();
  }).catch(function(err){
    adminOffBusy=false;
    var b=document.getElementById('adminOffBtn'); if(b){ b.disabled=false; b.textContent='Post as Alio'; }
    ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not post.');
  });
},{okText:'Post',danger:false,title:'Post as Alio?'});}
function adminOffEdit(id){
  var x=(adminOffPosts||[]).filter(function(q){return q.id===id;})[0]; if(!x) return;
  var old=document.getElementById('adminOffEditModal'); if(old) old.remove();
  var m=document.createElement('div'); m.className='modal-overlay'; m.id='adminOffEditModal';
  m.innerHTML='<div class="modal-box"><h3>✏️ Edit official post</h3>'
    +'<textarea class="ks-input" id="adminOffEditText" rows="5" maxlength="'+COMMUNITY_MAX_LEN+'" style="resize:vertical;width:100%;margin-bottom:12px">'+escapeHTML(x.text||'')+'</textarea>'
    +'<div style="display:flex;gap:8px"><button class="btn btn-ghost" style="flex:1" onclick="document.getElementById(\'adminOffEditModal\').remove()">Cancel</button>'
    +'<button class="btn btn-primary" style="flex:1" id="adminOffEditSave" onclick="adminOffEditSave(\''+id+'\')">Save</button></div></div>';
  document.body.appendChild(m);
}
function adminOffEditSave(id){
  var t=document.getElementById('adminOffEditText'), b=document.getElementById('adminOffEditSave'); if(!t) return;
  var text=t.value.trim(); if(!text){ ksAlert('The post cannot be empty.'); return; }
  if(b){ b.disabled=true; b.textContent='Saving…'; }
  window.KSFirebase.editCommunityPost(id,text).then(function(){
    var m=document.getElementById('adminOffEditModal'); if(m) m.remove(); adminOffLoad();
  }).catch(function(err){ if(b){ b.disabled=false; b.textContent='Save'; } ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not save.'); });
}
function adminOffPin(id,pin){
  if(pin){ var n=(adminOffPosts||[]).filter(function(q){return q.pinned;}).length; if(n>=PIN_LIMIT){ ksAlert('You can pin up to '+PIN_LIMIT+' messages at a time.'); return; } }
  window.KSFirebase.pinCommunityPost(id,pin).then(adminOffLoad).catch(function(err){ ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not update pin.'); });
}
function renderAdminAlioProfilePanel(el){
  ksStartAliCfg();
  adminOpfPhoto=null;
  var un=aliOfficialUsername();
  el.innerHTML='<div class="admin-card"><div class="admin-card-head"><h3>Official Alio profile</h3></div>'
    +'<p style="color:var(--muted);font-size:13.5px;margin:0 0 14px">This is the profile people see when they open the official Alio account from Community. It is separate from any admin\'s personal account. Leave a box empty to use the default.</p>'
    +'<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><div id="adminOpfAv"></div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost" style="padding:6px 14px;font-size:12.5px" onclick="document.getElementById(\'adminOpfFile\').click()">📷 Change picture</button>'
      +'<button class="btn btn-ghost" style="padding:6px 14px;font-size:12.5px" onclick="adminOpfResetPhoto()">Use default picture</button></div>'
      +'<input type="file" id="adminOpfFile" accept="image/*" style="display:none" onchange="adminOpfPick(this)"></div>'
    +'<label style="font-size:12px;font-weight:700;color:var(--sub)">NAME</label>'
    +'<input class="ks-input" id="adminOpfName" maxlength="40" placeholder="Alio" value="'+escapeHTML(aliProf.name||'')+'" style="width:100%;margin:4px 0 12px">'
    +'<label style="font-size:12px;font-weight:700;color:var(--sub)">USERNAME</label>'
    +'<input class="ks-input" id="adminOpfUser" maxlength="30" placeholder="e.g. alio" value="'+escapeHTML(un)+'" autocapitalize="none" autocomplete="off" style="width:100%;margin:4px 0 14px">'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-primary" id="adminOpfSave" style="padding:6px 16px;font-size:13px" onclick="adminOpfSave()">Save</button>'
    +'<button class="btn btn-ghost" style="padding:6px 14px;font-size:12.5px" onclick="aliOpenProfile()">Preview profile</button>'
    +'<span id="adminOpfStatus" style="font-size:12px;color:var(--sub)"></span></div></div>';
  adminOpfPaintAv();
}
function adminOpfPaintAv(){
  var av=document.getElementById('adminOpfAv'); if(!av) return;
  var pic=(adminOpfPhoto===null)?aliOfficialPic():(adminOpfPhoto||(typeof DEFAULT_ABOUT_PHOTO==='string'?DEFAULT_ABOUT_PHOTO:''));
  av.innerHTML=dmAvatarHTML({pic:pic||null,name:aliOfficialName()},72);
}
function adminOpfPick(input){
  var file=input.files&&input.files[0]; if(!file) return;
  if(!file.type||file.type.indexOf('image/')!==0){ ksAlert('Please choose an image file.'); return; }
  if(file.size>15*1024*1024){ ksAlert('Please choose an image under 15MB.'); return; }
  ksCompressImageToDataUrl(file,400,0.82).then(function(d){ adminOpfPhoto=d; adminOpfPaintAv(); })
    .catch(function(err){ ksAlert('Could not use that image: '+(err&&err.message?err.message:'please try another.')); });
  input.value='';
}
function adminOpfResetPhoto(){ adminOpfPhoto=''; adminOpfPaintAv(); }
function adminOpfSave(){
  if(adminOpfBusy) return;
  var n=document.getElementById('adminOpfName'), u=document.getElementById('adminOpfUser'), st=document.getElementById('adminOpfStatus'), b=document.getElementById('adminOpfSave');
  if(!n||!u||!window.KSFirebase||!window.KSFirebase.setAlioProfile) return;
  var name=n.value.trim().slice(0,40), user=u.value.trim().replace(/^@/,'');
  if(user&&!/^[A-Za-z0-9_.]{3,30}$/.test(user)){ ksAlert('Username can only use letters, numbers, underscores and dots (3–30 characters).'); return; }
  var photo=(adminOpfPhoto===null)?(typeof aliProf.photoDataUrl==='string'?aliProf.photoDataUrl:''):adminOpfPhoto;
  adminOpfBusy=true; if(b) b.disabled=true; if(st) st.textContent='Saving…';
  window.KSFirebase.setAlioProfile({name:name,username:user,photoDataUrl:photo}).then(function(){
    adminOpfBusy=false; if(b) b.disabled=false;
    aliProf={name:name,username:user,photoDataUrl:photo}; adminOpfPhoto=null;
    if(st) st.textContent='Saved ✓';
  }).catch(function(err){
    adminOpfBusy=false; if(b) b.disabled=false; if(st) st.textContent='';
    ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not save.');
  });
}
function adminAliTextCard(){
  return '<div class="admin-card"><div class="admin-card-head"><h3>Alio blue-tick pop-up</h3></div>'
    +'<p style="color:var(--muted);font-size:13.5px;margin:0 0 10px">This is the text people see when they tap Alio\'s official badge. Leave a box empty to use the default.</p>'
    +'<textarea class="ks-input" id="aliCfgText" rows="3" maxlength="500" placeholder="'+escapeHTML(ALIO_DEF_TEXT)+'" style="resize:vertical;width:100%;margin-bottom:8px">'+escapeHTML(aliCfg.text||'')+'</textarea>'
    +'<textarea class="ks-input" id="aliCfgPoints" rows="5" maxlength="1500" placeholder="One point per line (up to 8)" style="resize:vertical;width:100%;margin-bottom:8px">'+escapeHTML(aliCfg.points||'')+'</textarea>'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-primary" style="padding:6px 14px;font-size:12.5px" onclick="adminAliTextSave()">Save</button>'
    +'<button class="btn btn-ghost" style="padding:6px 14px;font-size:12.5px" onclick="adminAliTextSave(true)">Use default</button>'
    +'<button class="btn btn-ghost" style="padding:6px 14px;font-size:12.5px" onclick="aliOfficialInfo(event)">Preview</button>'
    +'<span id="aliCfgStatus" style="font-size:12px;color:var(--sub)"></span></div></div>';
}
function adminAliTextSave(reset){
  var a=document.getElementById('aliCfgText'), b=document.getElementById('aliCfgPoints'), st=document.getElementById('aliCfgStatus');
  if(!a||!b||!window.KSFirebase||!window.KSFirebase.setAlioOfficial) return;
  var text=reset?'':a.value.trim(), pts=reset?'':b.value.split('\n').map(function(x){return x.trim();}).filter(Boolean).slice(0,8).join('\n');
  if(st) st.textContent='Saving…';
  window.KSFirebase.setAlioOfficial(text,pts).then(function(){
    aliCfg={text:text,points:pts}; if(reset){ a.value=''; b.value=''; }
    if(st) st.textContent=reset?'Back to default ✓':'Saved ✓';
  }).catch(function(err){ if(st) st.textContent=''; ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not save.'); });
}
function adminOffDelete(id){
  ksAsk('Delete this official post? This cannot be undone.',function(){
  window.KSFirebase.deleteCommunityPost(id).then(adminOffLoad).catch(function(err){
    ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not delete.');
  });
},{okText:'Delete',title:'Delete official post?'});}


/* ── Admin: official badges for chosen accounts ──
   Only an admin (from this dashboard) can give or remove one. Shown as a coloured verified badge;
   the metallic gold badge is reserved for the official Alio account. The admin writes a note (up to
   100 words) that everyone sees when they tap the badge. Enforced by Firestore rules. */
function badgeWordCount(t){ return String(t||'').trim().split(/\s+/).filter(Boolean).length; }
function renderAdminBadgesPanel(el){
  badgeEl=el; var K=window.KSFirebase; if(!K) return;
  ksStartBadges();
  if(!badgeUsersTried&&K.adminListUsers){ badgeUsersTried=true; K.adminListUsers().then(function(m){ Object.keys(m).forEach(function(u){ adminUsers[u]=m[u]; }); adminLoadUnames(Object.keys(m)); adminBadgeRender(); }).catch(function(){}); }
  adminBadgeRender();
}
function adminBadgeRender(){
  if(adminView==='users'&&huSel){ setTimeout(function(){ if(adminView==='users'&&huSel&&huTab!=='edit') huRenderProfile(); },500); return; }
  if(adminView!=='badges'||!badgeEl||!document.body.contains(badgeEl)) return;
  adminBadgeTypesCapture();
  var keepQ=document.getElementById('badgeQ'), qv=keepQ?keepQ.value:badgeQ;
  var holders=Object.keys(ksBadges);
  var found=badgeFound.map(function(u){ var p=adminPerson(u); return '<div class="ks-chat-row" onclick="adminBadgeChoose(\''+u+'\')">'+adminAvatarHTML(p,36)+'<div class="ks-chat-main"><div class="ks-chat-name">'+escapeHTML(p.name)+(ksBadges[u]?' '+ksBadgeSVG(ksBadgeType(ksBadges[u].type).color,ksBadgeType(ksBadges[u].type).tick).replace('<svg','<svg style="width:15px;height:15px;vertical-align:middle"'):'')+'</div><div class="ks-chat-prev">'+(p.username?'@'+escapeHTML(p.username)+' · ':'')+escapeHTML(p.email||u)+'</div></div></div>'; }).join('');
  badgeEl.innerHTML='<div class="admin-card">'
    +'<div class="admin-card-head"><h3>Give a badge</h3></div>'
    +'<p style="color:var(--muted);font-size:13.5px;margin:0 0 12px">Pick any account (admin accounts included), choose a badge type, and it appears next to their name. Each type has its own colour and default text, and you can edit them in <b>Badge types</b> below. You can also add a personal note. The official Alio account has its own special metallic gold badge, which cannot be given to anyone.</p>'
    +'<div class="ks-chat-compose" style="margin-top:0"><input class="ks-input" id="badgeQ" placeholder="Email, username, name or user ID" value="'+escapeHTML(qv)+'" oninput="badgeQ=this.value" onkeydown="if(event.key===\'Enter\')adminBadgeFind()" style="flex:1"><button class="btn btn-primary" onclick="adminBadgeFind()">Find</button></div>'
    +(badgeMsg?'<div style="font-size:13px;color:var(--sub);margin-top:8px">'+escapeHTML(badgeMsg)+'</div>':'')
    +found
  +'</div>'
  +'<div class="admin-card"><div class="admin-card-head"><h3>Badge holders</h3><span class="admin-count">'+holders.length+'</span></div>'
    +(holders.length?holders.map(function(u){ var p=adminPerson(u), b=ksBadges[u], bt=ksBadgeType(b.type), n=((b.note||b.title)||'').trim(); return '<div class="ks-chat-row" style="cursor:default">'+adminAvatarHTML(p,36)+'<div class="ks-chat-main"><div class="ks-chat-name">'+escapeHTML(p.name)+' '+ksBadgeSVG(bt.color,bt.tick).replace('<svg','<svg style="width:15px;height:15px;vertical-align:middle"')+' <span style="font-size:11.5px;font-weight:600;color:'+bt.color+'">'+escapeHTML(bt.name)+'</span></div><div class="ks-chat-prev">'+(n?escapeHTML(n.length>60?n.slice(0,60)+'…':n)+' · ':'')+escapeHTML(p.email||u)+'</div></div><button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminBadgeChoose(\''+u+'\')">Edit</button><button class="btn btn-ghost" style="padding:5px 12px;font-size:12px;margin-left:6px" onclick="adminBadgeRemove(\''+u+'\')">Remove</button></div>'; }).join(''):'<p class="admin-empty">No one has a badge yet.</p>')
  +'</div>'+adminBadgeTypesCard();
}
function adminBadgeFind(){
  var raw=(badgeQ||'').trim(), q=raw.toLowerCase(); badgeFound=[]; badgeMsg='';
  if(!q){ adminBadgeRender(); return; }
  badgeFound=Object.keys(adminUsers).filter(function(u){ var p=adminPerson(u); return u.toLowerCase()===q||(p.email||'').toLowerCase().indexOf(q)!==-1||(p.name||'').toLowerCase().indexOf(q)!==-1||(p.username||'').toLowerCase()===q.replace(/^@/,''); }).slice(0,8);
  if(!badgeFound.length){ if(DM_UID_RE.test(raw)){ adminBadgeChoose(raw); return; } badgeMsg='No matching user found.'; }
  adminBadgeRender();
}
function adminBadgeClose(){ var m=document.getElementById('badgeModal'); if(m) m.remove(); badgePick=''; }
// Pop-up that opens when the admin picks someone: write the note that will show when people tap the badge.
function adminBadgeChoose(uid){
  adminBadgeClose();
  badgePick=uid;
  var p=adminPerson(uid), cur=ksBadges[uid], note=cur?((cur.note||cur.title)||''):'';
  badgePickType=cur?ksBadgeType(cur.type).id:'blue';
  var chips=KS_BADGE_TYPE_DEFS.map(function(x){ var t=ksBadgeType(x.id); return '<button type="button" class="badge-type-chip'+(t.id===badgePickType?' on':'')+'" data-bt="'+t.id+'" onclick="adminBadgeSetType(\''+t.id+'\')" style="--bc:'+t.color+'"><span class="bt-ico">'+ksBadgeSVG(t.color,t.tick)+'</span>'+escapeHTML(t.name)+'</button>'; }).join('');
  var m=document.createElement('div'); m.className='modal-overlay'; m.id='badgeModal';
  m.innerHTML='<div class="modal-box" style="max-width:420px">'
    +'<h3>🏅 '+(cur?'Edit badge for ':'Give badge to ')+escapeHTML(p.name)+'</h3>'
    +'<div class="badge-type-row">'+chips+'</div>'
    +'<p style="font-size:13px;color:var(--muted);margin:0 0 10px">Optional personal note, shown to everyone when they tap the badge. If you leave it empty, only the badge type\'s default text is shown. Up to '+BADGE_MAX_WORDS+' words.</p>'
    +'<textarea class="ks-input" id="badgeNote" rows="5" maxlength="800" placeholder="Optional note about this person" style="resize:vertical" oninput="adminBadgeCount()">'+escapeHTML(note)+'</textarea>'
    +'<div id="badgeCount" style="font-size:12px;color:var(--sub);text-align:right;margin:4px 0 12px"></div>'
    +'<div style="display:flex;gap:8px"><button class="btn btn-ghost" style="flex:1" onclick="adminBadgeClose()">Cancel</button><button class="btn btn-primary" id="badgeGiveBtn" style="flex:1" onclick="adminBadgeGive()">'+(cur?'Save badge':'Give badge')+'</button></div>'
  +'</div>';
  document.body.appendChild(m);
  adminBadgeCount();
  var ta=document.getElementById('badgeNote'); if(ta) ta.focus();
}
function adminBadgeSetType(id){
  badgePickType=id;
  var els=document.querySelectorAll('#badgeModal .badge-type-chip');
  for(var k=0;k<els.length;k++){ els[k].classList.toggle('on',els[k].getAttribute('data-bt')===id); }
}
function adminBadgeTypesCapture(){
  if(badgeSkipCapture){ badgeSkipCapture=false; return; } // just saved/reset: don't re-read the old boxes
  if(!document.getElementById('btn_blue')) return;
  var d={}, g=function(i){ var e=document.getElementById(i); return e?e.value:''; };
  KS_BADGE_TYPE_DEFS.forEach(function(x){ d[x.id]={color:g('btc_'+x.id),tick:g('btk_'+x.id),name:g('btn_'+x.id),text:g('btt_'+x.id)}; });
  badgeTypeDraft=d;
}
function adminBadgeTypesCard(){
  var rows=KS_BADGE_TYPE_DEFS.map(function(x){
    var t=ksBadgeType(x.id), dr=badgeTypeDraft&&badgeTypeDraft[x.id];
    var color=dr&&dr.color?dr.color:t.color, tick=dr&&dr.tick?dr.tick:t.tick, name=dr?dr.name:t.name, text=dr?dr.text:t.text;
    return '<div style="border:1px solid var(--border);border-radius:14px;padding:12px;margin-bottom:10px">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
        +'<span id="bti_'+x.id+'" style="width:26px;height:26px;display:inline-flex">'+ksBadgeSVG(color,tick).replace('<svg','<svg style="width:26px;height:26px"')+'</span>'
        +'<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><button type="button" class="badge-color-btn" id="btc_'+x.id+'" data-cp-open="1" value="'+escapeHTML(color)+'" style="background:'+escapeHTML(color)+'" aria-label="Badge colour for '+escapeHTML(name||x.name)+'" onclick="adminBadgePickColor(\''+x.id+'\',\'color\')"></button><span style="font-size:10px;color:var(--sub)">Badge</span></div>'
        +'<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><button type="button" class="badge-color-btn" id="btk_'+x.id+'" data-cp-open="1" value="'+escapeHTML(tick)+'" style="background:'+escapeHTML(tick)+'" aria-label="Tick colour for '+escapeHTML(name||x.name)+'" onclick="adminBadgePickColor(\''+x.id+'\',\'tick\')"></button><span style="font-size:10px;color:var(--sub)">Tick</span></div>'
        +'<input class="ks-input" id="btn_'+x.id+'" maxlength="30" value="'+escapeHTML(name)+'" placeholder="'+escapeHTML(x.name)+'" style="flex:1;min-width:0">'
      +'</div>'
      +'<textarea class="ks-input" id="btt_'+x.id+'" rows="2" maxlength="400" placeholder="'+escapeHTML(x.text)+'" style="resize:vertical;width:100%">'+escapeHTML(text)+'</textarea>'
      +'<div style="margin-top:8px"><button type="button" class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminBadgeResetOpen(\''+x.id+'\')">Use default</button></div>'
    +'</div>';
  }).join('');
  return '<div class="admin-card"><div class="admin-card-head"><h3>Badge types</h3></div>'
    +'<p style="color:var(--muted);font-size:13.5px;margin:0 0 12px">Edit each type\'s badge colour, tick colour, name and default text. The default text is what everyone sees when they tap that badge. Changes apply to everyone who already has it.</p>'
    +rows
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-primary" style="padding:6px 14px;font-size:12.5px" onclick="adminBadgeTypesSave()">Save</button>'
    +'<button class="btn btn-ghost" style="padding:6px 14px;font-size:12.5px" onclick="ksAsk(\'Reset ALL badge types (colour, name and text) to defaults?\',function(){adminBadgeTypesSave(true)},{okText:\'Reset\',title:\'Reset badge types?\'})">Reset all types</button>'
    +'<span id="btStatus" style="font-size:12px;color:var(--sub)"></span></div></div>';
}
function adminBadgeResetClose(){ var m=document.getElementById('badgeResetModal'); if(m) m.remove(); }
function adminBadgeResetOpen(id){
  adminBadgeResetClose();
  var def=KS_BADGE_TYPE_DEFS.filter(function(x){return x.id===id;})[0]; if(!def) return;
  var cur=ksBadgeType(id), dn=(document.getElementById('btn_'+id)||{}).value||cur.name;
  var b=function(w,label){ return '<button type="button" class="btn btn-ghost" style="width:100%;margin-bottom:8px;text-align:left" onclick="adminBadgeResetDo(\''+id+'\',\''+w+'\')">'+label+'</button>'; };
  var m=document.createElement('div'); m.className='modal-overlay'; m.id='badgeResetModal';
  m.innerHTML='<div class="modal-box" style="max-width:380px"><h3>Use default for "'+escapeHTML(dn)+'"</h3>'
    +'<p style="font-size:13px;color:var(--muted);margin:0 0 12px">Only this badge is changed. What do you want to put back to default?</p>'
    +b('color','🎨 Badge colour')+b('tick','✔️ Tick colour')+b('name','🏷️ Name')+b('text','📝 Description')+b('all','♻️ All of this badge')
    +'<button type="button" class="btn btn-secondary" style="width:100%" onclick="adminBadgeResetClose()">Cancel</button></div>';
  document.body.appendChild(m);
}
function adminBadgeResetDo(id,what){
  var K=window.KSFirebase; if(!K||!K.setBadgeTypes) return;
  var def=KS_BADGE_TYPE_DEFS.filter(function(x){return x.id===id;})[0]; if(!def) return;
  adminBadgeResetClose();
  adminBadgeTypesCapture();                                   // keep any unsaved edits on the other badges
  var d=badgeTypeDraft||{}, o={};
  Object.keys(ksBadgeTypesCfg||{}).forEach(function(k){ var v=ksBadgeTypesCfg[k]||{}; o[k]={name:v.name||'',color:v.color||'',tick:v.tick||'',text:v.text||''}; });
  var t=o[id]||(o[id]={name:'',color:'',tick:'',text:''}), dr=d[id]||(d[id]={color:ksBadgeType(id).color,tick:ksBadgeType(id).tick,name:ksBadgeType(id).name,text:ksBadgeType(id).text});
  if(what==='color'||what==='all'){ t.color=''; dr.color=def.color; }
  if(what==='tick'||what==='all'){ t.tick=''; dr.tick=ksAutoTick(dr.color); }
  if(what==='color'||what==='all'){ if(!t.tick) dr.tick=ksAutoTick(dr.color); }
  if(what==='name'||what==='all'){ t.name=''; dr.name=def.name; }
  if(what==='text'||what==='all'){ t.text=''; dr.text=def.text; }
  var st=document.getElementById('btStatus'); if(st) st.textContent='Saving…';
  K.setBadgeTypes(o).then(function(){
    ksBadgeTypesCfg=o; badgeTypeDraft=d; badgeSkipCapture=true; adminBadgeRender(); badgeSkipCapture=false;
    var s2=document.getElementById('btStatus'); if(s2) s2.textContent='Back to default ✓';
  }).catch(function(err){ if(st) st.textContent=''; ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not save.'); });
}
function adminBadgePickColor(id,which){
  which=which==='tick'?'tick':'color';
  var btn=document.getElementById((which==='tick'?'btk_':'btc_')+id); if(!btn) return;
  if(typeof window.CFB_pickColor!=='function'){ ksAlert('The colour picker is not ready yet. Please try again in a moment.'); return; }
  window.CFB_pickColor(btn, btn.value||'#888888', function(hex){
    hex=String(hex||'').slice(0,7);
    var b=document.getElementById((which==='tick'?'btk_':'btc_')+id)||btn; b.value=hex; b.style.background=hex;
    var c=document.getElementById('btc_'+id), k=document.getElementById('btk_'+id), ico=document.getElementById('bti_'+id);
    if(ico&&c&&k) ico.innerHTML=ksBadgeSVG(c.value,k.value).replace('<svg','<svg style="width:26px;height:26px"');
  }, {noAlpha:true});
}
function adminBadgeTypesSave(reset){
  var K=window.KSFirebase, st=document.getElementById('btStatus'); if(!K||!K.setBadgeTypes) return;
  var o={}, g=function(i){ var e=document.getElementById(i); return e?e.value.trim():''; };
  if(!reset){ KS_BADGE_TYPE_DEFS.forEach(function(x){ var cc=g('btc_'+x.id), kk=g('btk_'+x.id); o[x.id]={name:g('btn_'+x.id),color:cc,tick:(kk.toLowerCase()===ksAutoTick(cc).toLowerCase()?'':kk),text:g('btt_'+x.id)}; }); }
  if(st) st.textContent='Saving…';
  K.setBadgeTypes(o).then(function(){
    ksBadgeTypesCfg=o; badgeTypeDraft=null; badgeSkipCapture=true; adminBadgeRender(); badgeSkipCapture=false;
    var s2=document.getElementById('btStatus'); if(s2) s2.textContent=reset?'Back to defaults ✓':'Saved ✓';
  }).catch(function(err){ if(st) st.textContent=''; ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not save.'); });
}
function adminBadgeCount(){
  var ta=document.getElementById('badgeNote'), c=document.getElementById('badgeCount'), b=document.getElementById('badgeGiveBtn'); if(!ta||!c) return;
  var n=badgeWordCount(ta.value), over=n>BADGE_MAX_WORDS;
  c.textContent=n+' / '+BADGE_MAX_WORDS+' words'; c.style.color=over?'#FF5A5A':'var(--sub)';
  if(b) b.disabled=over;
}
function adminBadgeGive(){
  if(badgeBusy||!badgePick) return;
  var t=document.getElementById('badgeNote'), note=(t&&t.value||'').trim().slice(0,800);
  if(badgeWordCount(note)>BADGE_MAX_WORDS){ ksAlert('Please keep the note to '+BADGE_MAX_WORDS+' words or fewer.'); return; }
  var uid=badgePick, p=adminPerson(uid), typeId=badgePickType;
  var prev=ksBadges[uid], wasType=prev?ksBadgeType(prev.type).id:null;
  badgeBusy=true;
  window.KSFirebase.adminGiveBadge(uid,note,typeId).then(function(){
    badgeBusy=false; adminBadgeClose(); badgeQ=''; badgeFound=[]; badgeMsg='Badge saved for '+p.name+'.'; adminBadgeRender();
    // Ask the admin whether to notify the person (new badge, or the badge type changed).
    // A note-only edit does not trigger a message.
    if(!prev||wasType!==typeId) adminBadgeMsgOpen(prev?'update':'grant',uid,typeId,note);
  }).catch(function(err){ badgeBusy=false; ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not save the badge.'); });
}
function adminBadgeRemove(uid){
  var p=adminPerson(uid), prev=ksBadges[uid], typeId=ksBadgeType(prev&&prev.type).id;
  ksAsk('Remove the badge from '+p.name+'?',function(){
  window.KSFirebase.adminRemoveBadge(uid).then(function(){
    badgeMsg='Badge removed from '+p.name+'.'; adminBadgeRender();
    adminBadgeMsgOpen('remove',uid,typeId,'');
  }).catch(function(err){ ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not remove the badge.'); });
},{okText:'Remove badge',title:'Remove badge?'});}

/* ── Automated badge messages (admin-approved) ──
   After a badge is given, changed or removed, a pop-up shows a ready-written message from the
   official Alio account. Nothing is sent unless the admin taps "Send message". The admin can edit
   the wording first, or tap "Don't send". It goes through the normal official inbox chat
   (inboxMessages), so the person sees it in Messages like any other message from Alio. */
function adminBadgeMsgDefault(kind,uid,typeId,note){
  var p=adminPerson(uid), first=String((p&&p.name)||'').trim().split(/\s+/)[0]||'there';
  var t=ksBadgeType(typeId), n=String(note||'').trim();
  var hi='Hi '+first+',\n\n';
  if(kind==='remove'){
    return hi+'This is an update from the Alio team. Your "'+t.name+'" badge has been removed from your account and no longer appears next to your name.\n\nIf you have any questions about this, you are welcome to reply in this chat or email us at '+EMAIL+'.\n\nRegards,\nTeam Alio';
  }
  if(kind==='update'){
    return hi+'Your Alio badge has been updated. You now hold the "'+t.name+'" badge, and it is shown next to your name across Alio. Anyone can tap it to see what it stands for.'+(n&&n.length<=300?'\n\nNote from the team: '+n:'')+'\n\nThank you for being part of the community.\n\nRegards,\nTeam Alio';
  }
  return hi+'🎉 Congratulations! The Alio team has awarded you the "'+t.name+'" badge.\n\nIt now appears next to your name across Alio, and anyone can tap it to see what it stands for.'+(n&&n.length<=300?'\n\nNote from the team: '+n:'')+'\n\nThank you for being a valued part of the community.\n\nRegards,\nTeam Alio';
}
function adminBadgeMsgOpen(kind,uid,typeId,note){
  // Admin accounts are not messaged about their own badges.
  if(COMMUNITY_ADMIN_UIDS.indexOf(uid)!==-1) return;
  var old=document.getElementById('badgeMsgModal'); if(old) old.remove();
  badgeMsgCtx={kind:kind,uid:uid,typeId:typeId,note:note};
  var p=adminPerson(uid);
  var title=kind==='remove'?'Notify about the removed badge?':(kind==='update'?'Notify about the updated badge?':'Send a congratulations message?');
  var m=document.createElement('div'); m.className='modal-overlay'; m.id='badgeMsgModal';
  m.innerHTML='<div class="modal-box" style="max-width:460px">'
    +'<h3>💬 '+title+'</h3>'
    +'<p style="font-size:13px;color:var(--muted);margin:0 0 10px">This automated message will be sent to <b>'+escapeHTML(p.name)+'</b> in their Messages, from the official Alio account. Nothing is sent unless you tap <b>Send message</b>. You can edit the wording first.</p>'
    +'<textarea class="ks-input" id="badgeMsgText" rows="9" maxlength="1000" style="resize:vertical;width:100%" oninput="adminBadgeMsgCount()">'+escapeHTML(adminBadgeMsgDefault(kind,uid,typeId,note))+'</textarea>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0 12px"><button type="button" class="btn btn-ghost" style="padding:4px 10px;font-size:12px" onclick="adminBadgeMsgReset()">↺ Reset to default</button><span id="badgeMsgCount" style="font-size:12px;color:var(--sub)"></span></div>'
    +'<div style="display:flex;gap:8px"><button class="btn btn-ghost" style="flex:1" onclick="adminBadgeMsgClose()">Don\'t send</button><button class="btn btn-primary" id="badgeMsgSend" style="flex:1" onclick="adminBadgeMsgSend()">Send message</button></div>'
  +'</div>';
  document.body.appendChild(m);
  adminBadgeMsgCount();
}
function adminBadgeMsgClose(){ var m=document.getElementById('badgeMsgModal'); if(m) m.remove(); badgeMsgCtx=null; badgeMsgBusy=false; }
function adminBadgeMsgCount(){
  var ta=document.getElementById('badgeMsgText'), c=document.getElementById('badgeMsgCount'), b=document.getElementById('badgeMsgSend'); if(!ta||!c) return;
  var n=ta.value.trim().length; c.textContent=n+' / 1000';
  if(b) b.disabled=(n<1||n>1000);
}
function adminBadgeMsgReset(){
  var ta=document.getElementById('badgeMsgText'); if(!ta||!badgeMsgCtx) return;
  ta.value=adminBadgeMsgDefault(badgeMsgCtx.kind,badgeMsgCtx.uid,badgeMsgCtx.typeId,badgeMsgCtx.note); adminBadgeMsgCount();
}
function adminBadgeMsgSend(){
  if(badgeMsgBusy||!badgeMsgCtx) return;
  var ta=document.getElementById('badgeMsgText'), text=(ta&&ta.value||'').trim(); if(!text) return;
  var uid=badgeMsgCtx.uid, p=adminPerson(uid), btn=document.getElementById('badgeMsgSend');
  badgeMsgBusy=true; if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
  window.KSFirebase.sendInboxMessage(uid,text).then(function(){
    adminBadgeMsgClose(); badgeMsg='Message sent to '+p.name+'.'; adminBadgeRender();
  }).catch(function(err){
    badgeMsgBusy=false; if(btn){ btn.disabled=false; btn.textContent='Send message'; }
    ksAlert(ksFriendlyAuthError?ksFriendlyAuthError(err):'Could not send the message.');
  });
}

/* ── Admin inbox (WhatsApp-style chats with users) ──
   Admin-only screens. Users can reply inside a chat YOU started; they can edit their own
   messages but never delete. Everything is enforced by the Firestore rules, not just here. */
function adminEnsureFallback(uid){
  if(adminLookupStarted[uid]||!window.KSFirebase||!window.KSFirebase.lookupAuthorFromPosts) return;
  adminLookupStarted[uid]=true;
  window.KSFirebase.lookupAuthorFromPosts(uid).then(function(r){
    if(r){ adminLookup[uid]=r; adminInboxRefresh(); adminDMRefreshHead(); }
  });
}
function adminWatchUids(uids){
  if(window.KSFirebase&&window.KSFirebase.watchPublicProfiles) window.KSFirebase.watchPublicProfiles(uids,ksOnProfile);
  uids.forEach(function(u){ if(!communityProfiles[u]) adminEnsureFallback(u); });
}
function adminLoadUnames(uids,force){
  var need=(uids||[]).filter(function(u){ return DM_UID_RE.test(u||'') && !adminUnameBusy[u] && (force || !(u in adminUnames)); });
  if(!need.length||!window.KSFirebase||!window.KSFirebase.adminFetchUsernames) return;
  need.forEach(function(u){ adminUnameBusy[u]=true; });
  window.KSFirebase.adminFetchUsernames(need).then(function(m){
    need.forEach(function(u){ adminUnameBusy[u]=false; adminUnames[u]=m[u]||''; });
    if(adminInboxEl && document.body.contains(adminInboxEl)) adminInboxRefresh();
    if(typeof adminModRender==='function') adminModRender();
    if(typeof huLive==='function'&&huLive()&&huSel&&huTab==='overview') huRenderProfile();
  });
}
function adminPerson(uid){
  var lp=communityProfiles[uid]||{}, au=adminUsers[uid]||{}, fb=adminLookup[uid]||{}, cp={};
  (communityPosts||[]).some(function(p){ if(p.uid===uid){cp=p;return true;} return false; });
  var name=((lp.displayName||'').trim())||((au.displayName||'').trim())||((cp.displayName||'').trim())||((fb.displayName||'').trim());
  var pic=ksPicView(ksSafePic(lp.photoDataUrl)||ksSafePic(au.photoDataUrl)||ksSafePic(cp.photoDataUrl)||ksSafePic(fb.photoDataUrl));
  return {uid:uid,name:name||('User '+String(uid).slice(0,6)),hasName:!!name,pic:pic,email:au.email||'',username:(lp.username||adminUnames[uid]||'')};
}
function adminAvatarHTML(p,size){
  size=size||44;
  var inner=p.pic?'<img src="'+escapeHTML(p.pic)+'" alt="" style="width:100%;height:100%;object-fit:cover">':escapeHTML((p.hasName?p.name:'?').charAt(0).toUpperCase());
  return '<div class="ks-chat-avatar"'+ksOD(p.uid,1)+' style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.42)+'px">'+inner+'</div>';
}
function adminTickHTML(m){ return m.read?'<span class="ks-tick seen">✓✓</span>':'<span class="ks-tick">✓</span>'; }
function adminMsgDate(m){ return (m&&m.createdAt&&m.createdAt.toDate)?m.createdAt.toDate():null; }
function adminShortTime(m){
  var d=adminMsgDate(m); if(!d) return '';
  return (d.toDateString()===new Date().toDateString())
    ? d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})
    : d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
}
function adminThreadOf(m){ return m.toUid===KS_ADMIN_BOX ? m.fromUid : m.toUid; }
function adminConversations(){
  var map={},order=[];
  adminInboxMsgs.forEach(function(m){
    var u=adminThreadOf(m); if(!u) return;
    if(!map[u]){ map[u]={uid:u,msgs:[],unread:0}; order.push(u); }
    map[u].msgs.push(m);
    if(m.toUid===KS_ADMIN_BOX && !m.read) map[u].unread++;
  });
  return order.map(function(u){ var c=map[u]; c.last=c.msgs[0]; return c; });
}
function adminCopyText(t,btn){
  var done=function(){ if(btn){ var o=btn.getAttribute('data-label')||btn.textContent; btn.setAttribute('data-label',o); btn.textContent='✅ Copied!'; setTimeout(function(){btn.textContent=o;},1500); } };
  var fb=function(){ try{ var ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }catch(e){} done(); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done).catch(fb); else fb();
}
function adminEnsureThreads(){
  if(!adminThreadsLoaded||!window.KSFirebase||!window.KSFirebase.ensureThread) return;
  adminConversations().forEach(function(c){
    if(!adminThreads[c.uid] && !adminThreadEnsured[c.uid]){
      adminThreadEnsured[c.uid]=true;
      window.KSFirebase.ensureThread(c.uid).catch(function(){ delete adminThreadEnsured[c.uid]; });
    }
  });
}

function renderAdminInboxPanel(el){
  adminInboxEl=el; adminBcastOpen=false;
  el.innerHTML='<div class="admin-card"><p style="color:var(--muted)">Loading inbox…</p></div>';
  var u1=window.KSFirebase.subscribeAllInboxMessages(function(list,err){
    if(err){ el.innerHTML=adminErrorHtml(err); return; }
    adminInboxMsgs=list||[];
    var seen={},uids=[];
    adminInboxMsgs.forEach(function(m){ var u=adminThreadOf(m); if(u&&!seen[u]){seen[u]=1;uids.push(u);} });
    if(adminChatUid&&!seen[adminChatUid]) uids.push(adminChatUid);
    adminWatchUids(uids);
    adminEnsureThreads();
    adminInboxRefresh();
  });
  var u2=window.KSFirebase.subscribeThreads?window.KSFirebase.subscribeThreads(function(map){
    adminThreads=map||{}; adminThreadsLoaded=true; adminEnsureThreads(); adminInboxRefresh();
  }):function(){};
  var u3=window.KSFirebase.subscribeUsersList?window.KSFirebase.subscribeUsersList(function(map){
    adminUsers=map||{}; adminLoadUnames(Object.keys(adminUsers)); adminInboxRefresh();
  }):function(){};
  adminInboxUnsub=function(){ u1(); u2(); u3(); };
}
function adminInboxRefresh(){
  var el=adminInboxEl; if(!el||!document.body.contains(el)) return;
  if(adminBcastOpen){ adminBcastRefreshList(); return; }
  if(adminChatUid&&!adminChatInfo){
    var h=document.getElementById('adminChatHead'), m=document.getElementById('adminChatMsgs');
    if(h&&m){ h.innerHTML=adminChatHeadInner(adminChatUid); adminChatFillMsgs(false); return; }
  }
  if(!adminChatUid&&adminTab==='users'&&document.getElementById('adminUsersList')){
    document.getElementById('adminUsersList').innerHTML=adminUsersRows(); return;
  }
  adminInboxRender();
}
function adminTabsHTML(){
  var unread=adminConversations().reduce(function(a,c){return a+c.unread;},0);
  return '<div class="admin-tabs" style="margin-bottom:12px">'
    +'<button class="admin-tab'+(adminTab==='chats'?' active':'')+'" onclick="adminSetTab(\'chats\')">📨 Chats'+(unread?' ('+unread+')':'')+'</button>'
    +'<button class="admin-tab'+(adminTab==='users'?' active':'')+'" onclick="adminSetTab(\'users\')">👥 Users</button>'
  +'</div>';
}
function adminSetTab(t){ adminTab=t; adminInboxRender(); }
function adminUsersRows(){
  var q=(adminUserSearch||'').trim().toLowerCase();
  var uids=Object.keys(adminUsers).filter(function(u){
    if(!q) return true;
    var p=adminPerson(u);
    return (p.name||'').toLowerCase().indexOf(q)!==-1 || (p.email||'').toLowerCase().indexOf(q)!==-1 || (p.username||'').toLowerCase().indexOf(q.replace(/^@/,''))!==-1 || u.toLowerCase().indexOf(q)!==-1;
  });
  uids.sort(function(a,b){ return adminPerson(a).name.toLowerCase()<adminPerson(b).name.toLowerCase()?-1:1; });
  if(!uids.length) return '<p class="admin-empty">'+(Object.keys(adminUsers).length?'No one matches your search.':'No users found yet.')+'</p>';
  return uids.map(function(u){
    var p=adminPerson(u);
    return '<div class="ks-chat-row" onclick="adminOpenInfoFor(\''+u+'\')">'+adminAvatarHTML(p,42)
      +'<div class="ks-chat-main"><div class="ks-chat-name">'+escapeHTML(p.name)+communityGrantedBadgeHTML(u)+'</div>'
      +'<div class="ks-chat-prev">'+(p.username?'@'+escapeHTML(p.username)+' · ':'')+escapeHTML(p.email||'No email on file')+'</div></div></div>';
  }).join('');
}
function adminInboxRender(){
  try{ ksStartBadges(); }catch(e){}
  var el=adminInboxEl; if(!el) return;
  if(adminBcastOpen){ adminBcastRender(); return; }
  if(adminChatUid&&adminChatInfo){ el.innerHTML=adminInfoHTML(adminChatUid); return; }
  if(adminChatUid){
    el.innerHTML='<div class="admin-card">'
      +'<div class="ks-chat-head"><button class="btn btn-ghost" style="padding:6px 12px" onclick="adminChatBack()">←</button><div id="adminChatHead" style="display:contents"></div></div>'
      +'<div class="ks-chat-msgs" id="adminChatMsgs"></div>'
      +'<div id="adminReplyBar" class="ks-replybar"></div>'
      +'<div class="ks-chat-compose"><textarea class="ks-input" id="adminChatInput" rows="2" maxlength="1000" placeholder="Type a message…" oninput="adminChatDraft=this.value"></textarea>'
      +'<button class="btn btn-primary" id="adminChatSendBtn" onclick="adminChatSend()">Send</button></div>'
    +'</div>';
    document.getElementById('adminChatHead').innerHTML=adminChatHeadInner(adminChatUid);
    var inp=document.getElementById('adminChatInput'); if(inp) inp.value=adminChatDraft;
    ksBindBubbleBox('adminChatMsgs',adminMsgMenu,adminStartReply);
    adminChatFillMsgs(true);
    return;
  }
  if(adminTab==='users'){
    el.innerHTML=adminBcastBtnHTML()+'<div class="admin-card">'+adminTabsHTML()
      +'<input class="ks-input" id="adminUserSearchBox" placeholder="Search name, username, email or user ID" value="'+escapeHTML(adminUserSearch)+'" oninput="adminUserSearch=this.value;adminInboxRefresh()" style="margin-bottom:10px">'
      +'<div id="adminUsersList">'+adminUsersRows()+'</div></div>';
    return;
  }
  var convs=adminConversations();
  var rows=convs.map(function(c){
    var p=adminPerson(c.uid);
    var mine=(c.last.toUid!==KS_ADMIN_BOX);
    return '<div class="ks-chat-row" onclick="adminOpenChat(\''+c.uid+'\')">'
      +adminAvatarHTML(p,46)
      +'<div class="ks-chat-main"><div class="ks-chat-name">'+escapeHTML(p.name)+communityGrantedBadgeHTML(c.uid)+'</div>'
      +'<div class="ks-chat-prev">'+(mine?adminTickHTML(c.last)+' You: ':'')+escapeHTML(c.last.text||'')+'</div></div>'
      +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><div class="ks-chat-time">'+escapeHTML(adminShortTime(c.last))+'</div>'
      +(c.unread?'<span class="ks-unread-dot">'+(c.unread>9?'9+':c.unread)+'</span>':'')+'</div>'
    +'</div>';
  }).join('');
  var newForm=adminNewChatOpen
    ?'<div style="display:flex;gap:8px;margin-bottom:12px"><input class="ks-input" id="adminNewUid" placeholder="Paste a user ID" style="flex:1"><button class="btn btn-primary" onclick="adminStartChat()">Start</button></div>'
    :'';
  el.innerHTML=adminBcastBtnHTML()+'<div class="admin-card">'+adminTabsHTML()
    +'<div class="admin-card-head"><h3>Chats</h3><button class="btn btn-ghost" style="padding:6px 12px;font-size:12px" onclick="adminToggleNewChat()">'+(adminNewChatOpen?'Cancel':'+ New chat')+'</button></div>'
    +newForm
    +(convs.length?rows:'<p class="admin-empty">No chats yet. Tap ⋮ on any Community post → “Direct message”, pick someone in the Users tab, or use + New chat.</p>')
  +'</div>';
}
function adminChatHeadInner(uid){
  var p=adminPerson(uid);
  var th=adminThreads[uid];
  return '<div class="ks-chat-head-info" onclick="adminOpenInfo()" style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">'
    +adminAvatarHTML(p,42)
    +'<div style="min-width:0"><div class="ks-chat-name">'+escapeHTML(p.name)+communityGrantedBadgeHTML(uid)+'</div>'
    +'<div style="font-size:11.5px;color:var(--sub)">'+((th&&th.muted)?'🔇 Replies muted · ':'')+'Tap for contact info</div></div></div>';
}
function adminChatFillMsgs(forceBottom){
  var box=document.getElementById('adminChatMsgs'); if(!box) return;
  if(adminEditingId){ var eb=document.getElementById('adminEditBox'); if(eb) adminEditDraft=eb.value; }
  var atBottom=forceBottom||(box.scrollHeight-box.scrollTop-box.clientHeight<80);
  var msgs=adminInboxMsgs.filter(function(m){return adminThreadOf(m)===adminChatUid;}).slice().reverse();
  var me=currentUser&&currentUser.uid;
  box.innerHTML=msgs.length?msgs.map(function(m){
    var d=adminMsgDate(m);
    var when=d?d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'sending…';
    var fromUser=(m.toUid===KS_ADMIN_BOX);
    var edited=m.edited?' <span class="community-post-edited">(edited)</span>':'';
    var canEdit=(!fromUser && m.fromUid===me);
    var body;
    if(adminEditingId===m.id){
      body='<textarea class="ks-input" id="adminEditBox" rows="3" maxlength="1000" oninput="adminEditDraft=this.value" style="width:100%;resize:vertical">'+escapeHTML(adminEditDraft)+'</textarea>'
        +'<div class="ks-bubble-meta"><button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" onclick="adminCancelEdit()">Cancel</button><button class="btn btn-primary" style="padding:4px 10px;font-size:12px" onclick="adminSaveEdit(\''+m.id+'\')">Save</button></div>';
    }else{
      body='<div>'+(m.replyTo?ksQuoteHTML(m.replyTo,msgs,function(o){ return o.toUid===KS_ADMIN_BOX?adminPerson(adminChatUid).name:'You'; }):'')+escapeHTML(m.text||'')+'</div>'
        +'<div class="ks-bubble-meta"><span>'+escapeHTML(when)+'</span>'+edited+(fromUser?'':adminTickHTML(m))+(d?KS_DOTS_HTML:'')+'</div>';
    }
    return '<div class="ks-bubble'+(fromUser?' in':'')+'"'+((d&&adminEditingId!==m.id)?' data-mid="'+m.id+'"':'')+'>'+body+'</div>';
  }).join(''):'<p class="admin-empty">No messages yet — say hi 👋</p>';
  if(atBottom) box.scrollTop=box.scrollHeight;
  adminReplyBarSync(msgs);
  // Seen receipts: replies from this user count as read once you have the chat open.
  msgs.forEach(function(m){
    if(m.toUid===KS_ADMIN_BOX && !m.read && !adminMarking[m.id]){
      adminMarking[m.id]=true;
      window.KSFirebase.markInboxRead(m.id).catch(function(){ delete adminMarking[m.id]; });
    }
  });
}
function adminReplyBarSync(list){
  var o=null; if(adminReplyId){ for(var i=0;i<list.length;i++){ if(list[i].id===adminReplyId){ o=list[i]; break; } } }
  if(adminReplyId&&!o){ adminReplyId=null; }
  ksReplyBarFill('adminReplyBar',o?{name:(o.toUid===KS_ADMIN_BOX?adminPerson(adminChatUid).name:'yourself'),text:o.text}:null,'adminCancelReply()');
}
function adminThreadMsgs(){ return adminInboxMsgs.filter(function(m){return adminThreadOf(m)===adminChatUid;}); }
function adminStartReply(id){
  if(!adminChatUid) return;
  var list=adminThreadMsgs(); if(!list.some(function(x){ return x.id===id; })) return;
  adminReplyId=id; adminReplyBarSync(list);
  var inp=document.getElementById('adminChatInput'); if(inp){ try{ inp.focus({preventScroll:true}); }catch(e){ inp.focus(); } }
}
function adminCancelReply(){ adminReplyId=null; adminReplyBarSync(adminThreadMsgs()); }
function adminStartEdit(id){
  var m=adminInboxMsgs.filter(function(x){return x.id===id;})[0]; if(!m) return;
  adminEditingId=id; adminEditDraft=m.text||''; adminChatFillMsgs(false);
}
function adminCancelEdit(){ adminEditingId=null; adminEditDraft=''; adminChatFillMsgs(false); }
function adminSaveEdit(id){
  var eb=document.getElementById('adminEditBox'); var text=(eb?eb.value:adminEditDraft).trim();
  if(!text){ ksAlert('Message cannot be empty.'); return; }
  window.KSFirebase.editInboxMessage(id,text).then(function(){ adminEditingId=null; adminEditDraft=''; adminChatFillMsgs(false); })
    .catch(function(err){ ksAlert('Could not save: '+(err&&err.message?err.message:err)); });
}
function adminInfoHTML(uid){
  var p=adminPerson(uid);
  var au=adminUsers[uid]||{};
  var th=adminThreads[uid];
  var msgs=adminInboxMsgs.filter(function(m){return adminThreadOf(m)===uid;});
  var sent=msgs.filter(function(m){return m.toUid!==KS_ADMIN_BOX;});
  var replies=msgs.filter(function(m){return m.toUid===KS_ADMIN_BOX;});
  var seenCount=sent.filter(function(m){return m.read;}).length;
  var first=msgs.length?msgs[msgs.length-1]:null, last=msgs.length?msgs[0]:null;
  var fmt=function(m){ var d=adminMsgDate(m); return d?d.toLocaleString('en-GB'):'—'; };
  var isAdm=(COMMUNITY_ADMIN_UIDS.indexOf(uid)!==-1);
  var muted=!!(th&&th.muted);
  var upd=''; if(au.updatedAt){ var ud=new Date(au.updatedAt); if(!isNaN(ud)) upd=ud.toLocaleString('en-GB'); }
  var emailBtn=p.email?'<a class="btn btn-ghost" style="text-decoration:none" href="mailto:'+escapeHTML(p.email)+'">✉️ Email</a>':'';
  return '<div class="admin-card">'
    +'<div class="ks-chat-head"><button class="btn btn-ghost" style="padding:6px 12px" onclick="adminCloseInfo()">←</button><div style="font-weight:700">Contact info</div></div>'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0 16px">'
      +adminAvatarHTML(p,96)
      +'<div style="font-family:Syne,sans-serif;font-weight:700;font-size:20px;text-align:center">'+escapeHTML(p.name)+communityGrantedBadgeHTML(uid)+(isAdm?' <span class="community-admin-badge">Admin</span>':'')+'</div>'
    +'</div>'
    +'<div class="ks-info-row"><span>Email</span><span>'+escapeHTML(p.email||'Not on file')+'</span></div>'
    +'<div class="ks-info-row"><span>Username</span><span>'+(p.username?'@'+escapeHTML(p.username):'Not chosen yet')+'</span></div>'
    +'<div class="ks-info-row"><span>User ID</span><span style="font-family:\'Share Tech Mono\',monospace;font-size:12px">'+escapeHTML(uid)+'</span></div>'
    +(upd?'<div class="ks-info-row"><span>Profile last updated</span><span>'+escapeHTML(upd)+'</span></div>':'')
    +'<div class="ks-info-row"><span>Messages you sent</span><span>'+sent.length+' ('+seenCount+' seen)</span></div>'
    +'<div class="ks-info-row"><span>Replies from them</span><span>'+replies.length+'</span></div>'
    +'<div class="ks-info-row"><span>First message</span><span>'+escapeHTML(fmt(first))+'</span></div>'
    +'<div class="ks-info-row"><span>Last message</span><span>'+escapeHTML(fmt(last))+'</span></div>'
    +'<div class="ks-info-row"><span>Their replies</span><span>'+(!th?'Not opened yet':(muted?'🔇 Muted':'✅ Allowed'))+'</span></div>'
    +'<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">'
      +'<button class="btn btn-primary" onclick="adminOpenChat(\''+uid+'\')">📨 Message</button>'
      +emailBtn
      +'<button class="btn btn-ghost" data-label="📋 Copy User ID" onclick="adminCopyText(\''+uid+'\',this)">📋 Copy User ID</button>'
      +(isAdm?'':'<button class="btn btn-ghost" onclick="modOpenUser(\''+uid+'\')">🛡️ Moderate</button>')
      +(th?'<button class="btn btn-ghost" onclick="adminToggleMute(\''+uid+'\')">'+(muted?'🔊 Unmute replies':'🔇 Mute replies')+'</button>':'')
    +'</div>'
  +'</div>';
}
function adminToggleMute(uid){
  var th=adminThreads[uid]; var next=!(th&&th.muted);
  (function(__r){if(next){ksAsk('Stop this person from replying? They will still see your messages.',__r,{okText:'Stop replies',title:'Stop replies?'});return;}__r();})(function(){
  window.KSFirebase.setThreadMuted(uid,next).catch(function(err){ ksAlert('Could not update: '+(err&&err.message?err.message:err)); });
});}
function adminOpenChat(uid){ adminChatUid=uid; adminChatInfo=false; adminChatDraft=''; adminEditingId=null; adminReplyId=null; adminWatchUids([uid]); adminInboxRender(); }
function adminChatBack(){ adminChatUid=null; adminChatInfo=false; adminChatDraft=''; adminEditingId=null; adminReplyId=null; adminInboxRender(); }
function adminOpenInfo(){ adminLoadUnames([adminChatUid],true); adminChatInfo=true; adminInfoFrom='chat'; adminInboxRender(); }
function adminOpenInfoFor(uid){ adminLoadUnames([uid],true); adminChatUid=uid; adminChatInfo=true; adminInfoFrom='users'; adminWatchUids([uid]); adminInboxRender(); }
function adminCloseInfo(){
  adminChatInfo=false;
  if(adminInfoFrom==='users'){ adminChatUid=null; adminInfoFrom='chat'; }
  adminInboxRender();
}
function adminToggleNewChat(){ adminNewChatOpen=!adminNewChatOpen; adminInboxRender(); }
function adminStartChat(){
  var inp=document.getElementById('adminNewUid'); var uid=(inp&&inp.value||'').trim();
  if(!/^[A-Za-z0-9_-]{6,128}$/.test(uid)){ ksAlert('Please paste a valid user ID.'); return; }
  adminNewChatOpen=false; adminOpenChat(uid);
}
function adminChatSend(){
  var inp=document.getElementById('adminChatInput'), btn=document.getElementById('adminChatSendBtn');
  var text=(inp&&inp.value||'').trim().slice(0,1000);
  if(!text||!adminChatUid) return;
  if(btn) btn.disabled=true;
  window.KSFirebase.sendInboxMessage(adminChatUid,text,adminReplyId||null).then(function(){
    adminChatDraft=''; adminReplyId=null; if(inp) inp.value='';
    if(btn) btn.disabled=false;
    adminChatFillMsgs(true);
  }).catch(function(err){
    if(btn) btn.disabled=false;
    ksAlert('Could not send: '+(err&&err.message?err.message:err));
  });
}

/* ── Message EVERYONE at once (admin only) — a separate page, outside the inbox lists ── */
function adminBcastBtnHTML(){
  return '<div class="admin-card" style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
    +'<div style="flex:1;min-width:190px"><div style="font-weight:700">📨 Message everyone at once</div>'
    +'<div style="font-size:12.5px;color:var(--sub);margin-top:2px">One message to every registered user\'s inbox.</div></div>'
    +'<button class="btn btn-primary" onclick="adminBcastOpenPage()">Message everyone</button></div>';
}
function adminBcastOpenPage(){ adminBcastOpen=true; adminBcastOff={}; adminBcastSearch=''; adminChatUid=null; adminChatInfo=false; adminInboxRender(); }
function adminBcastClose(){ adminBcastOpen=false; adminInboxRender(); }
function adminBcastAllUids(){
  var admins=(typeof COMMUNITY_ADMIN_UIDS!=='undefined')?COMMUNITY_ADMIN_UIDS:[];
  return Object.keys(adminUsers).filter(function(u){ return admins.indexOf(u)===-1; })
    .sort(function(a,b){ return adminPerson(a).name.toLowerCase()<adminPerson(b).name.toLowerCase()?-1:1; });
}
function adminBcastSelected(){ return adminBcastAllUids().filter(function(u){ return !adminBcastOff[u]; }); }
function adminBcastCountText(){
  var all=adminBcastAllUids().length, sel=adminBcastSelected().length;
  return sel+' of '+all+' selected';
}
function adminBcastListHTML(){
  var q=(adminBcastSearch||'').trim().toLowerCase().replace(/^@/,'');
  var uids=adminBcastAllUids().filter(function(u){
    if(!q) return true; var p=adminPerson(u);
    return (p.name||'').toLowerCase().indexOf(q)!==-1||(p.email||'').toLowerCase().indexOf(q)!==-1||(p.username||'').toLowerCase().indexOf(q)!==-1;
  });
  if(!uids.length) return '<p class="admin-empty">'+(adminBcastAllUids().length?'No one matches your search.':'No registered users found yet.')+'</p>';
  return uids.map(function(u){
    var p=adminPerson(u);
    return '<label class="ks-chat-row" style="cursor:pointer"><input type="checkbox" style="width:18px;height:18px;flex-shrink:0;accent-color:var(--accent)" '+(adminBcastOff[u]?'':'checked')+' onchange="adminBcastToggle(\''+u+'\',this.checked)">'
      +adminAvatarHTML(p,38)
      +'<div class="ks-chat-main"><div class="ks-chat-name">'+escapeHTML(p.name)+'</div>'
      +'<div class="ks-chat-prev">'+(p.username?'@'+escapeHTML(p.username)+' · ':'')+escapeHTML(p.email||'No email on file')+'</div></div></label>';
  }).join('');
}
function adminBcastToggle(uid,on){ if(on) delete adminBcastOff[uid]; else adminBcastOff[uid]=1; var c=document.getElementById('adminBcastCount'); if(c) c.textContent=adminBcastCountText(); }
function adminBcastSetAll(on){ adminBcastOff={}; if(!on) adminBcastAllUids().forEach(function(u){ adminBcastOff[u]=1; }); adminBcastRefreshList(); }
function adminBcastRefreshList(){
  var l=document.getElementById('adminBcastList'); if(l) l.innerHTML=adminBcastListHTML();
  var c=document.getElementById('adminBcastCount'); if(c) c.textContent=adminBcastCountText();
}
function adminBcastRender(){
  var el=adminInboxEl; if(!el) return;
  el.innerHTML='<div class="admin-card">'
    +'<div class="ks-chat-head"><button class="btn btn-ghost" style="padding:6px 12px" onclick="adminBcastClose()">←</button><div style="font-weight:700;font-size:16px">Message everyone at once</div></div>'
    +'<p style="color:var(--muted);font-size:13px;margin:10px 0">Sent as a normal inbox message from the official account. Everyone is ticked automatically. Untick anyone you want to skip.</p>'
    +'<textarea class="ks-input" id="adminBcastText" rows="5" maxlength="1000" placeholder="Write your message…" oninput="adminBcastText=this.value" style="width:100%;resize:vertical"></textarea>'
    +'<input class="ks-input" id="adminBcastSearchBox" placeholder="Search a user to untick" value="'+escapeHTML(adminBcastSearch)+'" oninput="adminBcastSearch=this.value;adminBcastRefreshList()" style="margin:12px 0 8px;width:100%">'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px">'
      +'<span id="adminBcastCount" style="font-size:13px;font-weight:600;margin-right:auto"></span>'
      +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminBcastSetAll(true)">Select all</button>'
      +'<button class="btn btn-ghost" style="padding:5px 12px;font-size:12px" onclick="adminBcastSetAll(false)">Clear all</button></div>'
    +'<div id="adminBcastList" style="max-height:46vh;overflow-y:auto"></div>'
    +'<div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" id="adminBcastSendBtn" onclick="adminBcastSend()">Send to selected</button></div>'
  +'</div>';
  var t=document.getElementById('adminBcastText'); if(t) t.value=adminBcastText;
  adminBcastRefreshList();
}
function adminBcastSend(){
  var t=document.getElementById('adminBcastText'), btn=document.getElementById('adminBcastSendBtn');
  var text=(t&&t.value||'').trim().slice(0,1000), uids=adminBcastSelected();
  if(!text){ ksAlert('Write a message first.'); return; }
  if(!uids.length){ ksAlert('No one is selected.'); return; }
  ksAsk('Send this message to '+uids.length+' user'+(uids.length===1?'':'s')+'?',function(){
    if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
    window.KSFirebase.sendInboxBulk(uids,text).then(function(n){
      adminBcastOpen=false; adminBcastText=''; adminBcastOff={}; adminTab='chats'; adminInboxRender();
      ksAlert('✅ Sent to '+n+' user'+(n===1?'':'s')+'.');
    }).catch(function(err){
      if(btn){ btn.disabled=false; btn.textContent='Send to selected'; }
      ksAlert('Could not send to everyone: '+(err&&err.message?err.message:err));
    });
  },{okText:'Send',title:'Message everyone?'});
}

/* ── Direct message from a Community post/reply (admin only) ── */
function adminDMRefreshHead(){
  var h=document.getElementById('ksDmHead'); if(!h||!adminDmUid) return;
  var p=adminPerson(adminDmUid);
  h.innerHTML=adminAvatarHTML(p,42)+'<div style="min-width:0"><div class="ks-chat-name">'+escapeHTML(p.name)+communityGrantedBadgeHTML(adminDmUid)+'</div><div style="font-size:11.5px;color:var(--sub)">Direct message</div></div>';
}
function communityDirectMessage(uid){
  if(!communityIsAdmin()||!uid) return;
  adminDMClose();
  adminDmUid=uid;
  adminWatchUids([uid]);
  var ov=document.createElement('div'); ov.id='ksDmOverlay'; ov.className='ks-dm-overlay';
  ov.innerHTML='<div class="ks-dm-box" onclick="event.stopPropagation()">'
    +'<div id="ksDmHead" class="ks-chat-head" style="margin-bottom:12px"></div>'
    +'<textarea class="ks-input" id="ksDmText" rows="4" maxlength="1000" placeholder="Type your message…" style="width:100%;resize:vertical"></textarea>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;align-items:center">'
      +'<span id="ksDmStatus" style="margin-right:auto;font-size:12.5px;color:var(--sub)"></span>'
      +'<button class="btn btn-ghost" onclick="adminDMClose()">Cancel</button>'
      +'<button class="btn btn-primary" id="ksDmSend" onclick="adminDMSend()">Send</button>'
    +'</div></div>';
  ov.addEventListener('click',adminDMClose);
  document.body.appendChild(ov);
  adminDMRefreshHead();
  var t=document.getElementById('ksDmText'); if(t) t.focus();
}
function adminDMClose(){ var o=document.getElementById('ksDmOverlay'); if(o) o.remove(); adminDmUid=null; }
function adminDMSend(){
  var t=document.getElementById('ksDmText'), b=document.getElementById('ksDmSend'), st=document.getElementById('ksDmStatus');
  var text=(t&&t.value||'').trim().slice(0,1000);
  if(!text||!adminDmUid){ if(st) st.textContent='Write a message first.'; return; }
  if(b) b.disabled=true;
  window.KSFirebase.sendInboxMessage(adminDmUid,text).then(function(){
    if(st) st.textContent='✅ Sent';
    setTimeout(adminDMClose,700);
  }).catch(function(err){
    if(b) b.disabled=false;
    if(st) st.textContent='Could not send: '+(err&&err.message?err.message:err);
  });
}
function adminDeleteInboxMsg(id){
  ksAsk('Delete this message?',function(){
  window.KSFirebase.deleteInboxMessage(id).catch(function(err){
    ksAlert('Could not delete: '+(err&&err.message?err.message:err));
  });
},{okText:'Delete',title:'Delete message?'});}

/* ═══════════════════════ USER-FACING INBOX (chat with Alio) ═══════════════════════
   A user can only reply inside a chat the admin started (the rules enforce this). They can
   edit their own messages — shown as "(edited)" — but never delete anything. */
function adminMsgMenu(id,el){
  var m=adminInboxMsgs.filter(function(x){return x.id===id;})[0]; if(!m) return;
  var mine=(currentUser&&m.fromUid===currentUser.uid)&&m.toUid!==KS_ADMIN_BOX, items=[];
  items.push({label:'↩️ Reply',run:function(){ adminStartReply(id); }});
  items.push({label:'📋 Copy',run:function(){ dmCopyText(m.text||''); }});
  if(mine) items.push({label:'✏️ Edit',run:function(){ adminStartEdit(id); }});
  items.push({label:'🗑 Delete',danger:true,run:function(){ adminDeleteInboxMsg(id); }});
  ksPopOpen(el,items,!mine);
}
function renderAdminModerationPanel(el){
  modEl=el; var K=window.KSFirebase; if(!K) return;
  modWatchReports();
  if(!modUsersTried&&K.adminListUsers){ modUsersTried=true; K.adminListUsers().then(function(m){ Object.keys(m).forEach(function(u){ adminUsers[u]=m[u]; }); adminLoadUnames(Object.keys(m)); if(!modUid) adminModRender(); }).catch(function(){}); }
  if(modUid&&!modInfo&&!modLoading) modLoad();
  adminModRender();
}
function adminModRender(){
  if(adminView!=='moderation'||!modEl||!document.body.contains(modEl)) return;
  modEl.innerHTML=modUid?modUserHTML():modListHTML();
}
function renderAdminAnalyticsPanel(el){
  visEl=el; anDraw();
  if(!visData||visLoadedRange!==visRange||Date.now()-visLoadedAt>300000) visLoad();
  try{ var d=visDay(0); if(localStorage.getItem('ks_an_purge')!==d&&window.KSFirebase&&KSFirebase.adminPurgeVisits){ localStorage.setItem('ks_an_purge',d); KSFirebase.adminPurgeVisits(visDay(90)).catch(function(){}); } }catch(e){}
}
function renderAdminBuilderPanel(el){
  var me=(typeof currentUser!=='undefined'&&currentUser)?currentUser.uid:'';
  if(me!==BUILDER_UID){ el.innerHTML='<div class="admin-card"><h3>🧑‍💻 Builder page</h3><p class="admin-empty">Only the owner account can edit this page.</p></div>'; return; }
  bpDirty=false;
  var f=function(id,l,rows,note,max){ var oi=' maxlength="'+max+'" oninput="bpDirty=true;bpCount(\''+id+'\','+max+')"'; return '<label for="'+id+'">'+l+'</label>'+(rows?'<textarea id="'+id+'" class="ks-input" rows="'+rows+'"'+oi+'></textarea>':'<input id="'+id+'" class="ks-input"'+oi+'>')+'<span class="community-char-count" id="'+id+'Cnt" style="display:block;text-align:right;margin-top:3px">'+max+' characters left</span>'+(note?'<small>'+note+'</small>':''); };
  el.innerHTML='<div class="admin-card bpf"><h3>🧑‍💻 Edit builder page</h3><p style="font-size:12.5px;color:var(--muted)">Only your owner account can edit this. Everyone else sees the saved page. Every heading and text on the page can be changed here.</p>'
    +f('bpEye','Small heading above the greeting',0,'Default: 🙋 The builder. Leave blank to use the default.',40)
    +f('bpGreet','Greeting line (before my name)',0,'Default: Hello, I am. Leave blank to use the default.',60)
    +f('bpName','My name',0,'',80)+f('bpHead','Tagline under my name',0,'Leave blank to hide it.',120)+f('bpBio','About me (first person)',9,'A blank line starts a new paragraph.',3000)
    +'<label>Sections</label><small style="margin:0 0 4px">Each section is a card on the page with its own heading and text.</small><div id="bpSecList"></div>'
    +'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px"><button type="button" class="btn btn-ghost" onclick="bpSecAdd()">+ Add section</button><span class="community-char-count" id="bpSecsCnt"></span></div>'
    +f('bpIg','Instagram link',0,'Leave blank to hide the button.',200)+f('bpEmail','Email address',0,'Leave blank to hide the button.',120)
    +'<label>Extra buttons</label><small style="margin:0 0 4px">These appear as buttons at the bottom of the page, like YouTube, GitHub or your website. Give each one a name and a link.</small><div id="bpLnkList"></div>'
    +'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px"><button type="button" class="btn btn-ghost" onclick="bpLnkAdd()">+ Add button</button><span class="community-char-count" id="bpLinksCnt"></span></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button class="btn btn-primary" onclick="bpSave()">Save</button><button class="btn btn-ghost" onclick="bpDone()">View page</button><button class="btn btn-ghost" onclick="bpReset()">Reset to default</button></div><div id="bpMsg" style="margin-top:10px;font-size:13px"></div></div>';
  var fill=function(){
    if(bpDirty) return;
    var s=function(id,k){ var e=document.getElementById(id); if(e) e.value=bpPick(k); };
    s('bpEye','eyebrow'); s('bpGreet','greeting'); s('bpName','name'); s('bpHead','headline'); s('bpBio','bio'); s('bpEmail','email'); s('bpIg','ig');
    var sl=document.getElementById('bpSecList'); if(sl) sl.innerHTML=bpParseSecs(bpPick('sections')).map(bpSecRow).join('');
    var ll=document.getElementById('bpLnkList'); if(ll) ll.innerHTML=bpParseLinks(bpPick('links')).map(bpLnkRow).join('');
    bpCountAll(); bpTotals();
  };
  fill();
  if(window.KSFirebase&&KSFirebase.watchBuilder){ var u=KSFirebase.watchBuilder(function(d){ builderData=d; fill(); setTimeout(function(){ try{u();}catch(e){} },0); }); }
}

try{ if(window.__ksCropWrap){ window.__ksCropWrap('adminOpfPick'); window.__ksCropWrap('uePhotoPick'); } }catch(e){}
try{ window.__ksAdminLoading=0; }catch(e){}
