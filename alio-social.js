/* alio-social.js — everything "social" that loads on demand for Alio.
   Today: group chat screens (moved over unchanged from alio-groups.js). Community posts and personal messages
   still live in index.html and can move here one piece at a time.
   Uses helpers that already live in index.html (dm*, ks*, gc* list side) and window.KSFirebase.gc* for the database. */
window.AlioSocial={version:2,parts:['groups']};


var gcMsgs=[], gcMsgsUnsub=null, gcMsgsFor=null, gcReplyId=null, gcEditingId=null, gcEditDraft='', gcDraft='', gcDraftFor=null, gcSeenMarking={}, gcWatchSig='';
var GC_REACT_BAR=['👍','❤️','😂','😮','😢','🔥','🙏'];

function gcK(){ return window.KSFirebase; }
function gcCur(){ return gcGroups.filter(function(g){ return g.id===gcActiveId; })[0]||null; }
function gcIsHost(g,uid){ return !!g&&(g.admins||[]).indexOf(uid)!==-1; }
function gcIsOwner(g,uid){ return !!g&&g.ownerUid===uid; }
function gcCanEditInfo(g){ var me=dmMe(); return gcIsHost(g,me)||g.membersCanEdit===true; }
function gcColor(uid){ var h=0,s=String(uid||''); for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))%360; } return 'hsl('+h+',62%,62%)'; }
function gcRoleTag(g,uid){ return gcIsOwner(g,uid)?' <span class="gc-role">Host</span>':(gcIsHost(g,uid)?' <span class="gc-role">Co-host</span>':''); }
function gcStopMsgs(){ if(gcMsgsUnsub){ gcMsgsUnsub(); gcMsgsUnsub=null; } gcMsgsFor=null; gcMsgs=[]; }

/* ───────────── The group chat screen ───────────── */
function gcRenderChat(){
  var id=gcActiveId; dmView='group';
  if(!id||!GC_ID_RE.test(id)){ dmBack(); return; }
  if(gcDraftFor!==id){ gcDraft=''; gcDraftFor=id; gcReplyId=null; gcEditingId=null; gcWatchSig=''; }
  appEl.innerHTML='<section class="ks-msgr"><div class="ks-msgr-shell">'
    +'<div class="ks-msgr-top"><button class="ks-msgr-back" onclick="dmBack()" aria-label="Back to messages">←</button><div class="ks-chat-head" id="gcChatHead"></div></div>'
    +'<div class="ks-chat-msgs" id="gcChatMsgs"></div>'
    +'<div id="gcChatNotice" class="ks-msgr-notice"></div>'
    +'<div id="gcReplyBar" class="ks-replybar"></div>'
    +'<div class="ks-chat-compose" id="gcCompose">'
      +'<textarea class="ks-input" id="gcInput" rows="1" maxlength="1000" placeholder="Write a message…" oninput="gcDraft=this.value;ksGrow(this)" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey&&window.innerWidth>700){event.preventDefault();gcSendNow();}"></textarea>'
      +'<button class="ks-msgr-send" id="gcSendBtn" onclick="gcSendNow()" aria-label="Send">➤</button>'
    +'</div></div></section>';
  var inp=document.getElementById('gcInput'); if(inp){ inp.value=gcDraft; ksGrow(inp); }
  if(gcMsgsFor!==id||!gcMsgsUnsub){
    gcStopMsgs(); gcMsgsFor=id;
    if(gcK()&&gcK().gcSubscribeMessages){
      gcMsgsUnsub=gcK().gcSubscribeMessages(id,function(list,err){
        gcMsgs=err?[]:(list||[]);
        if(curPage==='inbox'&&dmView==='group') gcChatFill();
      });
    }
  }
  ksBindBubbleBox('gcChatMsgs',gcMsgMenu,gcStartReply);
  gcChatFill(true);
  setTimeout(function(){ if(curPage==='inbox'&&dmView==='group'&&gcActiveId===id&&!gcCur()) gcChatFill(); },4300);
}
function gcTickHTML(g,m){
  var me=dmMe(), t=dmMs(m.createdAt);
  var all=(g.members||[]).every(function(u){ return u===me||dmMs(g.seen&&g.seen[u])>=t; });
  return dmTickHTML(all);
}
function gcReactChips(m){
  var r=m&&m.reactions; if(!r||typeof r!=='object') return '';
  if(typeof ksFlagOn==='function'&&!ksFlagOn('msg_react')&&!ksIsAdminNow()) return '';
  var cnt={},order=[],me=dmMe();
  Object.keys(r).forEach(function(u){ var e=r[u]; if(typeof e!=='string'||!e||e.length>40) return; if(!cnt[e]){ cnt[e]=0; order.push(e); } cnt[e]++; });
  if(!order.length) return '';
  order.sort(function(a,b){ return cnt[b]-cnt[a]; });
  return '<div class="ks-dmr">'+order.map(function(e){ var s=escapeHTML(e); return '<button type="button" data-e="'+s+'" class="ks-dmr-chip'+(me&&r[me]===e?' mine':'')+'" onclick="event.stopPropagation();gcReactTo(\''+m.id+'\',this.getAttribute(\'data-e\'))">'+s+(cnt[e]>1?' '+cnt[e]:'')+'</button>'; }).join('')+'</div>';
}
function gcChatFill(forceBottom){
  var box=document.getElementById('gcChatMsgs'); if(!box||dmView!=='group') return;
  var g=gcCur(), me=dmMe();
  var head=document.getElementById('gcChatHead'), comp=document.getElementById('gcCompose'), notice=document.getElementById('gcChatNotice');
  if(!g){
    var loading=!gcGroupsLoaded||(Date.now()-gcOpenTs<4000);
    if(head) head.innerHTML='';
    box.innerHTML='<p class="admin-empty">'+(loading?'Loading…':'You\'re no longer in this group.')+'</p>';
    if(comp) comp.style.display='none';
    if(notice) notice.innerHTML='';
    gcInfoClose();
    return;
  }
  var sig=g.id+':'+(g.members||[]).join(',');
  if(sig!==gcWatchSig){ gcWatchSig=sig; dmWatch(g.members||[]); }
  var n=(g.members||[]).length;
  if(head){
    head.innerHTML='<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;cursor:pointer" onclick="gcInfoOpen()">'+gcAvatarHTML(g,42)
      +'<div style="min-width:0"><div class="ks-chat-name">'+escapeHTML(g.name||'Group')+'</div><div style="font-size:11.5px;color:var(--sub)">'+n+' member'+(n===1?'':'s')+' · tap for info</div></div></div>'
      +'<button class="ks-kebab" aria-label="Group options" onclick="gcRowMenu(\''+g.id+'\',this)">⋮</button>';
  }
  var atBottom=(forceBottom===true)||(box.scrollHeight-box.scrollTop-box.clientHeight<80);
  if(gcEditingId){ var eb=document.getElementById('gcEditBox'); if(eb) gcEditDraft=eb.value; }
  var vis=gcMsgs.filter(function(x){ return !(x.hiddenFor&&x.hiddenFor.indexOf(me)!==-1); });
  box.innerHTML=vis.length?vis.map(function(m,ix){
    var mine=(m.fromUid===me);
    var d=m.createdAt&&m.createdAt.toDate?m.createdAt.toDate():null;
    var when=d?d.toLocaleString('en-GB',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'sending…';
    var edited=m.edited?' <span class="community-post-edited">(edited)</span>':'';
    var body;
    if(mine&&gcEditingId===m.id){
      body='<textarea class="ks-input" id="gcEditBox" rows="3" maxlength="1000" oninput="gcEditDraft=this.value" style="width:100%;resize:vertical">'+escapeHTML(gcEditDraft)+'</textarea>'
        +'<div class="ks-bubble-meta"><button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" onclick="gcCancelEdit()">Cancel</button><button class="btn btn-primary" style="padding:4px 10px;font-size:12px" onclick="gcSaveEdit(\''+m.id+'\')">Save</button></div>';
    }else{
      var sender=mine?'':'<div class="gc-sender" style="color:'+gcColor(m.fromUid)+'">'+escapeHTML(dmPerson(m.fromUid).name)+gcRoleTag(g,m.fromUid)+'</div>';
      body=sender+'<div>'+(m.replyTo?ksQuoteHTML(m.replyTo,vis,function(o){ return o.fromUid===me?'You':dmPerson(o.fromUid).name; }):'')+dmMsgBodyHTML(m,mine)+'</div>'
        +'<div class="ks-bubble-meta"><span>'+escapeHTML(when)+'</span>'+edited+(mine&&d?gcTickHTML(g,m):'')+(d?KS_DOTS_HTML:'')+'</div>'+gcReactChips(m);
    }
    var bub='<div class="ks-bubble'+(mine?'':' in')+'"'+((d&&!(mine&&gcEditingId===m.id))?' data-mid="'+m.id+'" data-mine="'+(mine?1:0)+'"':'')+'>'+body+'</div>';
    return ksDayDivider(m,vis[ix-1])+(mine?bub:'<div class="gc-mrow">'+dmAvatarHTML(dmPerson(m.fromUid),34,m.fromUid)+bub+'</div>');
  }).join(''):'<p class="admin-empty">No messages yet. Say hi 👋</p>';
  if(atBottom) box.scrollTop=box.scrollHeight;
  if(comp) comp.style.display='flex';
  if(notice) notice.innerHTML='';
  var inp=document.getElementById('gcInput'), btn=document.getElementById('gcSendBtn'); if(inp) inp.disabled=false; if(btn) btn.disabled=false;
  gcReplyBarSync(vis);
  if(document.getElementById('gcInfoOv')) gcInfoRender();
  if(dmChatUnread(g)){
    var key=g.id+':'+dmMs(g.lastAt);
    if(!gcSeenMarking[key]&&gcK()&&gcK().gcMarkSeen){
      gcSeenMarking[key]=true;
      gcK().gcMarkSeen(g.id).catch(function(){ delete gcSeenMarking[key]; });
    }
  }
}

/* ── Sending, replying, editing ── */
function gcSendNow(){
  var inp=document.getElementById('gcInput'), btn=document.getElementById('gcSendBtn');
  var text=(inp&&inp.value||'').trim().slice(0,1000), g=gcCur();
  if(!text||!g) return;
  if(!gcK()||!gcK().gcSend){ ksAlert('Still connecting — try again in a moment.'); return; }
  if(btn) btn.disabled=true;
  gcK().gcSend(g.id,text,gcReplyId||null).then(function(){
    gcDraft=''; gcReplyId=null; if(inp){ inp.value=''; ksGrow(inp); }
    if(btn) btn.disabled=false; gcChatFill(true);
  }).catch(function(){
    if(btn) btn.disabled=false; gcChatFill();
    ksAlert('Could not send your message. You may no longer be in this group, or your account may be restricted.');
  });
}
function gcVisMsgs(){ var me=dmMe(); return gcMsgs.filter(function(x){ return !(x.hiddenFor&&x.hiddenFor.indexOf(me)!==-1); }); }
function gcReplyBarSync(list){
  var o=null; if(gcReplyId){ for(var i=0;i<list.length;i++){ if(list[i].id===gcReplyId){ o=list[i]; break; } } }
  if(gcReplyId&&!o) gcReplyId=null;
  ksReplyBarFill('gcReplyBar',o?{name:(o.fromUid===dmMe()?'yourself':dmPerson(o.fromUid).name),text:o.text}:null,'gcCancelReply()');
}
function gcStartReply(id){
  var list=gcVisMsgs(); if(!list.some(function(x){ return x.id===id; })) return;
  gcReplyId=id; gcReplyBarSync(list);
  var inp=document.getElementById('gcInput'); if(inp){ try{ inp.focus({preventScroll:true}); }catch(e){ inp.focus(); } }
}
function gcCancelReply(){ gcReplyId=null; gcReplyBarSync(gcVisMsgs()); }
function gcStartEdit(id){
  var m=gcMsgs.filter(function(x){ return x.id===id; })[0]; if(!m) return;
  if(!ksEditOpen(m)){ ksAlert('You can only edit a message within 30 minutes of sending it.'); gcChatFill(); return; }
  gcEditingId=id; gcEditDraft=m.text||''; gcChatFill();
}
function gcCancelEdit(){ gcEditingId=null; gcEditDraft=''; gcChatFill(); }
function gcSaveEdit(id){
  var eb=document.getElementById('gcEditBox'); var t=((eb?eb.value:gcEditDraft)||'').trim().slice(0,1000);
  var g=gcCur(), m=gcMsgs.filter(function(x){ return x.id===id; })[0];
  if(!t||!g||!m||!gcK()||!gcK().gcEditMessage) return;
  if(t===m.text){ gcCancelEdit(); return; }
  var isLast=gcMsgs.length&&gcMsgs[gcMsgs.length-1].id===id;
  gcK().gcEditMessage(g.id,id,t,isLast).then(function(){ gcEditingId=null; gcEditDraft=''; gcChatFill(); })
    .catch(function(){ ksAlert('Could not edit that message. Messages can only be edited within 30 minutes of sending.'); });
}
function gcReactTo(id,emoji){
  var g=gcCur(); if(!g||!gcK()||!gcK().gcReact) return;
  if(typeof emoji!=='string'||!emoji||Array.from(emoji).length>10) return;
  gcK().gcReact(g.id,id,emoji).catch(function(){ ksAlert('Could not save your reaction. Please try again.'); });
}

/* ── Right-click / long-press / ⋮ menu on a message ── */
function gcMsgMenu(id,el){
  var m=gcMsgs.filter(function(x){ return x.id===id; })[0], g=gcCur(); if(!m||!g) return;
  var me=dmMe(), mine=(m.fromUid===me), items=[], cur=(m.reactions||{})[me];
  items.push({label:'↩️ Reply',run:function(){ gcStartReply(id); }});
  if((typeof ksFlagOn!=='function'||ksFlagOn('msg_react')||ksIsAdminNow())&&window.ksEmojiBar) items.push({label:'😊 React',run:function(){ ksEmojiBar(el,GC_REACT_BAR,cur,function(e){ gcReactTo(id,e); },true); }});
  items.push({label:'📋 Copy',run:function(){ dmCopyText(m.text||''); }});
  if(mine&&ksEditOpen(m)) items.push({label:'✏️ Edit',run:function(){ gcStartEdit(id); }});
  items.push({label:'🗑 Delete',danger:true,run:function(){ gcDeleteAsk(id); }});
  ksPopOpen(el,items,!mine);
}
function gcDeleteAsk(id){
  var me=dmMe(), g=gcCur(), m=gcMsgs.filter(function(x){ return x.id===id; })[0]; if(!m||!g) return;
  dmDeleteClose();
  var mine=(m.fromUid===me), host=gcIsHost(g,me), canAll=mine||host;
  var ov=document.createElement('div'); ov.id='ksDmDelOverlay'; ov.className='ks-dm-overlay';
  ov.innerHTML='<div class="ks-dm-box" onclick="event.stopPropagation()">'
    +'<div style="font-family:Syne,sans-serif;font-weight:700;font-size:17px;margin-bottom:6px">Delete message?</div>'
    +'<div style="font-size:13px;color:var(--sub);margin-bottom:14px">'+(canAll?'Delete for everyone removes it for all members'+(mine?'':' (you can do this because you are a Host)')+'. Delete for me only removes it on your side.':'This only removes the message on your side. Other members won\'t be affected.')+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px">'
      +(canAll?'<button class="btn btn-primary" onclick="gcDeleteForAll(\''+id+'\')">Delete for everyone</button>':'')
      +'<button class="btn btn-ghost" onclick="gcDeleteForMe(\''+id+'\')">Delete for me</button>'
      +'<button class="btn btn-ghost" onclick="dmDeleteClose()">Cancel</button>'
    +'</div></div>';
  ov.addEventListener('click',dmDeleteClose);
  document.body.appendChild(ov);
}
function gcDeleteForMe(id){
  var g=gcCur(); if(!g||!gcK()||!gcK().gcHideMessage) return;
  gcK().gcHideMessage(g.id,id).then(dmDeleteClose).catch(function(){ dmDeleteClose(); ksAlert('Could not delete that message. Please try again.'); });
}
function gcDeleteForAll(id){
  var g=gcCur(), m=gcMsgs.filter(function(x){ return x.id===id; })[0], me=dmMe();
  if(!g||!m||!gcK()) return;
  var wasLast=gcMsgs.length&&gcMsgs[gcMsgs.length-1].id===id;
  gcK().gcDeleteMessage(g.id,id,wasLast,m.fromUid===me).then(dmDeleteClose).catch(function(){ dmDeleteClose(); ksAlert('Could not delete that message.'); });
}

/* ───────────── Pictures ───────────── */
function gcCompressIcon(file,cb){
  if(!file||!/^image\//.test(file.type||'')){ cb(null); return; }
  var r=new FileReader();
  r.onload=function(){
    var img=new Image();
    img.onload=function(){
      try{
        var s=Math.min(img.width,img.height), c=document.createElement('canvas'); c.width=c.height=96;
        var x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,96,96);
        x.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,96,96);
        cb(c.toDataURL('image/jpeg',0.65));
      }catch(e){ cb(null); }
    };
    img.onerror=function(){ cb(null); };
    img.src=r.result;
  };
  r.onerror=function(){ cb(null); };
  r.readAsDataURL(file);
}

/* ───────────── Group info sheet ───────────── */
var gcNameEditing=false, gcDescEditing=false;
function gcInfoClose(){ var o=document.getElementById('gcInfoOv'); if(o) o.remove(); gcNameEditing=false; gcDescEditing=false; }
function gcInfoOpen(){
  if(!gcCur()) return;
  gcInfoClose();
  var ov=document.createElement('div'); ov.id='gcInfoOv'; ov.className='ks-dm-overlay';
  ov.addEventListener('click',gcInfoClose);
  document.body.appendChild(ov);
  gcInfoRender();
}
function gcInfoRender(){
  var ov=document.getElementById('gcInfoOv'); if(!ov) return;
  var g=gcCur(); if(!g){ gcInfoClose(); return; }
  var me=dmMe(), host=gcIsHost(g,me), owner=gcIsOwner(g,me), canEdit=gcCanEditInfo(g);
  var keepName=document.getElementById('gcInfoName'); var nameVal=keepName?keepName.value:g.name;
  var keepDesc=document.getElementById('gcInfoDesc'); var descVal=keepDesc?keepDesc.value:(g.description||''); var curDesc=String(g.description||'');
  var members=(g.members||[]).slice().sort(function(a,b){
    var ra=a===me?-1:gcIsOwner(g,a)?0:gcIsHost(g,a)?1:2, rb=b===me?-1:gcIsOwner(g,b)?0:gcIsHost(g,b)?1:2;
    if(ra!==rb) return ra-rb; return dmPerson(a).name.localeCompare(dmPerson(b).name);
  });
  var h='<div class="ks-dm-box ks-gc-box" onclick="event.stopPropagation()">'
    +'<div class="gc-modal-head"><div class="gc-modal-title">Group info</div><button class="ks-kebab" aria-label="Close" onclick="gcInfoClose()">✕</button></div>'
    +'<div class="gc-info-top">'
      +'<div'+(canEdit?' style="cursor:pointer" onclick="document.getElementById(\'gcInfoFile\').click()" title="Change group picture"':'')+'>'+gcAvatarHTML(g,84)+'</div>'
      +(canEdit?'<input type="file" id="gcInfoFile" accept="image/*" style="display:none" onchange="gcInfoPickIcon(this)"><div style="font-size:12px;color:var(--sub)">Tap the picture to change it</div>':'')
      +(gcNameEditing&&canEdit
        ?'<div class="ks-chat-compose" style="margin-top:4px;width:100%"><input class="ks-input" id="gcInfoName" maxlength="40" value="'+escapeHTML(nameVal)+'" style="flex:1"><button class="btn btn-primary" onclick="gcInfoSaveName()">Save</button><button class="btn btn-ghost" onclick="gcNameEditing=false;gcInfoRender()">Cancel</button></div>'
        :'<div style="font-family:Syne,sans-serif;font-weight:700;font-size:19px">'+escapeHTML(g.name||'Group')+(canEdit?' <button class="ks-kebab" aria-label="Edit name" style="font-size:15px;padding:2px 8px" onclick="gcNameEditing=true;gcInfoRender()">✏️</button>':'')+'</div>')
      +'<div style="font-size:12.5px;color:var(--sub)">'+members.length+' / 50 members</div>'
    +'</div>';
  if(gcDescEditing&&canEdit){
    h+='<div class="gc-label">Group description</div><textarea class="ks-input" id="gcInfoDesc" rows="4" maxlength="500" oninput="var c=document.getElementById(\'gcInfoDescN\');if(c)c.textContent=this.value.length+\' / 500\'" style="width:100%;resize:vertical" placeholder="What is this group about?">'+escapeHTML(descVal)+'</textarea>'
      +'<div style="display:flex;align-items:center;gap:8px;margin:6px 0 10px"><span id="gcInfoDescN" style="font-size:12px;color:var(--sub);flex:1">'+descVal.length+' / 500</span><button class="btn btn-ghost" onclick="gcDescEditing=false;gcInfoRender()">Cancel</button><button class="btn btn-primary" onclick="gcInfoSaveDesc()">Save</button></div>';
  }else if(curDesc){
    h+='<div class="gc-label">Group description'+(canEdit?' <button class="ks-kebab" aria-label="Edit description" style="font-size:15px;padding:2px 8px" onclick="gcDescEditing=true;gcInfoRender()">✏️</button>':'')+'</div>'
      +'<div style="font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word;margin-bottom:10px">'+escapeHTML(curDesc)+'</div>';
  }else if(canEdit){
    h+='<button class="btn btn-ghost" style="width:100%;margin:8px 0" onclick="gcDescEditing=true;gcInfoRender()">📝 Add group description</button>';
  }
  if(host){
    h+='<div class="settings-row"><div class="settings-row-text"><strong>Members can edit name &amp; picture</strong><span>Turn off so only Hosts can change them.</span></div>'
      +'<button class="ks-switch'+(g.membersCanEdit===true?' on':'')+'" id="gcSwCanEdit" role="switch" aria-checked="'+(g.membersCanEdit===true?'true':'false')+'" aria-label="Members can edit name and picture" onclick="gcToggleCanEdit()"></button></div>';
    h+='<button class="btn btn-primary" style="width:100%;margin:10px 0" onclick="gcOpenAdd()"'+(members.length>=50?' disabled':'')+'>➕ Add people</button>';
  }
  h+='<div class="gc-label">Members</div><div>';
  members.forEach(function(u){
    if(!DM_UID_RE.test(u)) return;
    var p=dmPerson(u);
    var canManage=(u!==me)&&host&&!gcIsOwner(g,u)&&(owner||!gcIsHost(g,u));
    h+='<div class="gc-member">'+dmAvatarHTML(p,40,u)
      +'<div class="ks-chat-main"><div class="ks-chat-name">'+escapeHTML(p.name)+(u===me?' <span style="font-weight:400;color:var(--sub);font-size:12px">(you)</span>':'')+gcRoleTag(g,u)+'</div>'
      +(p.username?'<div class="ks-chat-prev">@'+escapeHTML(p.username)+'</div>':'')+'</div>'
      +((canManage||u!==me)?'<button class="ks-kebab" aria-label="Member options" onclick="gcMemberMenu(\''+u+'\',this)">⋮</button>':'')+'</div>';
  });
  h+='</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">'
    +'<button class="btn btn-ghost" style="color:#FF5A5A" onclick="gcLeaveAsk(\''+g.id+'\')">🚪 Leave group</button>'
    +(owner?'<button class="btn btn-ghost" style="color:#FF5A5A" onclick="gcDeleteGroupAsk()">🗑 Delete group for everyone</button>':'')
    +'</div></div>';
  ov.innerHTML=h;
}
function gcInfoPickIcon(input){
  var g=gcCur(), f=input&&input.files&&input.files[0]; if(!g||!f) return;
  gcCompressIcon(f,function(data){
    if(!data){ ksAlert('That image could not be used. Try a different picture.'); return; }
    gcK().gcRename(g.id,{icon:data}).catch(function(){ ksAlert('Could not change the picture. Only Hosts can when member editing is off.'); });
  });
  input.value='';
}
function gcInfoSaveName(){
  var g=gcCur(), el=document.getElementById('gcInfoName'); if(!g||!el) return;
  var n=el.value.trim().slice(0,40); if(!n){ ksAlert('The group needs a name.'); return; }
  if(n===g.name){ gcNameEditing=false; gcInfoRender(); return; }
  gcK().gcRename(g.id,{name:n}).then(function(){ gcNameEditing=false; gcInfoRender(); }).catch(function(){ ksAlert('Could not change the name. Only Hosts can when member editing is off.'); });
}
function gcInfoSaveDesc(){
  var g=gcCur(), el=document.getElementById('gcInfoDesc'); if(!g||!el) return;
  var t=el.value.trim().slice(0,500);
  if(t===String(g.description||'')){ gcDescEditing=false; gcInfoRender(); return; }
  gcK().gcRename(g.id,{description:t}).then(function(){ gcDescEditing=false; gcInfoRender(); }).catch(function(){ ksAlert('Could not change the description. Only Hosts can when member editing is off.'); });
}
function gcToggleCanEdit(){
  var g=gcCur(); if(!g||!gcIsHost(g,dmMe())) return;
  gcK().gcSetCanEdit(g.id,!(g.membersCanEdit===true)).catch(function(){ ksAlert('Could not update the setting.'); });
}
function gcMemberMenu(uid,btn){
  var g=gcCur(); if(!g||!DM_UID_RE.test(uid)) return;
  var me=dmMe(), host=gcIsHost(g,me), owner=gcIsOwner(g,me), items=[];
  items.push({label:'👤 View profile',run:function(){ gcInfoClose(); openUserProfile(uid); }});
  if(uid!==me&&typeof dmOpenChat==='function') items.push({label:'📨 Message',run:function(){ gcInfoClose(); gcActiveId=null; try{ dmBack(); }catch(e){} dmOpenChat(uid); }});
  if(owner&&uid!==me&&!gcIsOwner(g,uid)){
    items.push({label:gcIsHost(g,uid)?'⬇️ Remove co-host':'⬆️ Make co-host',run:function(){
      var admins=(g.admins||[]).slice();
      if(gcIsHost(g,uid)) admins=admins.filter(function(a){ return a!==uid; }); else admins.push(uid);
      gcK().gcSetAdmins(g.id,admins).catch(function(){ ksAlert('Could not update. Please try again.'); });
    }});
  }
  if(host&&uid!==me&&!gcIsOwner(g,uid)&&(owner||!gcIsHost(g,uid))){
    items.push({label:'🚫 Remove from group',danger:true,run:function(){
      ksAsk('Remove '+dmPerson(uid).name+' from this group?',function(){
        gcK().gcRemoveMember(g,uid).catch(function(){ ksAlert('Could not remove them. Please try again.'); });
      },{okText:'Remove',title:'Remove member?'});
    }});
  }
  ksPopOpen(btn,items,false);
}
function gcDeleteGroupAsk(){
  var g=gcCur(); if(!g||!gcIsOwner(g,dmMe())) return;
  ksAsk('This deletes the group and all its messages for everyone. This can\'t be undone.',function(){
    gcK().gcDeleteGroup(g.id).then(function(){ gcInfoClose(); if(dmView==='group') dmBack(); }).catch(function(){ ksAlert('Could not delete the group. Please try again.'); });
  },{okText:'Delete',title:'Delete group?'});
}

/* ───────────── New group / Add people (one picker, two modes) ───────────── */
var gcPk={mode:'create',picked:{},icon:'',max:49,exclude:[],gid:null,gname:'',busy:false};
function gcPkClose(){ ksModalClose('gcPkOv'); }
function gcOpenCreate(){
  gcPk={mode:'create',picked:{},icon:'',max:49,exclude:[],gid:null,gname:'',busy:false};
  gcPkOpen();
}
function gcOpenAdd(){
  var g=gcCur(); if(!g||!gcIsHost(g,dmMe())) return;
  var room=50-(g.members||[]).length;
  if(room<=0){ ksAlert('This group is full (50 people).'); return; }
  gcPk={mode:'add',picked:{},icon:'',max:room,exclude:(g.members||[]).slice(),gid:g.id,gname:g.name||'',busy:false};
  gcPkOpen();
}
function gcPkOpen(){
  gcPkClose();
  var create=gcPk.mode==='create';
  var ov=document.createElement('div'); ov.id='gcPkOv'; ov.className='ks-dm-overlay';
  ov.innerHTML='<div class="ks-dm-box ks-gc-box" onclick="event.stopPropagation()">'
    +'<div class="gc-modal-head"><div class="gc-modal-title">'+(create?'New group':'Add people')+'</div><button class="ks-kebab" aria-label="Close" onclick="gcPkClose()">✕</button></div>'
    +(create?'<div class="gc-new-top"><button type="button" class="gc-icon-btn" id="gcPkIcon" onclick="document.getElementById(\'gcPkFile\').click()" aria-label="Choose group picture">📷</button>'
      +'<input type="file" id="gcPkFile" accept="image/*" style="display:none" onchange="gcPkPickIcon(this)">'
      +'<input class="ks-input" id="gcPkName" maxlength="40" placeholder="Group name" autocomplete="off" style="flex:1"></div>':'')
    +'<div class="gc-label">Add by username</div>'
    +'<div class="ks-chat-compose" style="margin-top:0"><input class="ks-input" id="gcPkSearch" maxlength="21" placeholder="Exact username, e.g. alex" autocomplete="off" onkeydown="if(event.key===\'Enter\'){gcPkSearchGo();}" style="flex:1">'
    +'<button class="btn btn-primary" onclick="gcPkSearchGo()">Add</button></div>'
    +'<div id="gcPkMsg" class="gc-msg"></div>'
    +'<div class="gc-label" id="gcPkSelLabel"></div><div class="gc-chips" id="gcPkSel"></div>'
    +'<div class="gc-label">Your chats</div><div class="gc-contacts" id="gcPkList"></div>'
    +'<button class="btn btn-primary" id="gcPkGo" style="width:100%;margin-top:12px" onclick="gcPkSubmit()"></button>'
    +'<div class="gc-note">Up to 50 people in a group. If someone turned off “Let people add me to groups”, they get an invite instead.</div></div>';
  ov.addEventListener('click',gcPkClose);
  document.body.appendChild(ov);
  gcPkFill();
}
function gcPkMsg(t){ var m=document.getElementById('gcPkMsg'); if(m) m.textContent=t||''; }
function gcPkFill(){
  var uids=Object.keys(gcPk.picked), create=gcPk.mode==='create';
  var lab=document.getElementById('gcPkSelLabel'); if(lab) lab.textContent=uids.length?('Selected ('+uids.length+' of '+gcPk.max+')'):'';
  var sel=document.getElementById('gcPkSel');
  if(sel) sel.innerHTML=uids.map(function(u){ return '<span class="gc-chip">'+escapeHTML(gcPk.picked[u].name)+'<button aria-label="Remove" onclick="gcPkToggle(\''+u+'\')">✕</button></span>'; }).join('');
  var me=dmMe();
  var contacts=dmChats.filter(function(c){ return c.status==='accepted'&&!c.blockedBy; }).map(dmOther).filter(function(u){
    return u&&DM_UID_RE.test(u)&&u!==me&&gcPk.exclude.indexOf(u)===-1&&!dmIsAdminUid(u);
  });
  contacts.sort(function(a,b){ return dmPerson(a).name.localeCompare(dmPerson(b).name); });
  var list=document.getElementById('gcPkList');
  if(list) list.innerHTML=contacts.length?contacts.map(function(u){
    var p=dmPerson(u), on=!!gcPk.picked[u];
    return '<div class="gc-crow'+(on?' on':'')+'" onclick="gcPkToggle(\''+u+'\')">'+dmAvatarHTML(p,36)
      +'<div class="ks-chat-main"><div class="ks-chat-name">'+escapeHTML(p.name)+'</div>'+(p.username?'<div class="ks-chat-prev">@'+escapeHTML(p.username)+'</div>':'')+'</div>'
      +'<span class="gc-check">'+(on?'✓':'')+'</span></div>';
  }).join(''):'<p class="admin-empty" style="margin:10px">No chats to pick from yet. Add people by username above.</p>';
  var go=document.getElementById('gcPkGo');
  if(go){ go.disabled=gcPk.busy||!uids.length; go.textContent=gcPk.busy?(create?'Creating…':'Adding…'):(create?'Create group':'Add '+(uids.length||'')+' '+(uids.length===1?'person':'people')); }
}
function gcPkToggle(uid){
  if(gcPk.picked[uid]){ delete gcPk.picked[uid]; }
  else{
    if(Object.keys(gcPk.picked).length>=gcPk.max){ gcPkMsg('You can add up to '+gcPk.max+' '+(gcPk.max===1?'person':'people')+' here.'); return; }
    var p=dmPerson(uid); gcPk.picked[uid]={name:p.name,username:p.username};
  }
  gcPkMsg(''); gcPkFill();
}
function gcPkSearchGo(){
  var el=document.getElementById('gcPkSearch'); if(!el) return;
  var name=el.value.trim().toLowerCase().replace(/^@/,'');
  if(!DM_USERNAME_RE.test(name)){ gcPkMsg('Enter a full username (3–20 letters, numbers or underscores).'); return; }
  if(!gcK()||!gcK().lookupUsername){ gcPkMsg('Still connecting — try again in a moment.'); return; }
  gcPkMsg('Searching…');
  gcK().lookupUsername(name).then(function(r){
    if(!r||!r.uid){ gcPkMsg('No user found with that username.'); return; }
    if(r.uid===dmMe()){ gcPkMsg('That\'s you — you\'re added automatically.'); return; }
    if(gcPk.exclude.indexOf(r.uid)!==-1){ gcPkMsg('They are already in this group.'); return; }
    if(dmIsAdminUid(r.uid)){ gcPkMsg('Official admin accounts can\'t be added to groups.'); return; }
    if(gcPk.picked[r.uid]){ gcPkMsg('Already selected.'); return; }
    if(Object.keys(gcPk.picked).length>=gcPk.max){ gcPkMsg('You can add up to '+gcPk.max+' '+(gcPk.max===1?'person':'people')+' here.'); return; }
    dmWatch([r.uid]);
    gcPk.picked[r.uid]={name:(r.profile&&r.profile.displayName)||'Alio user',username:name};
    el.value=''; gcPkMsg(''); gcPkFill();
  }).catch(function(){ gcPkMsg('Search failed. Please try again.'); });
}
function gcPkPickIcon(input){
  var f=input&&input.files&&input.files[0]; if(!f) return;
  gcCompressIcon(f,function(data){
    if(!data){ gcPkMsg('That image could not be used. Try a different picture.'); return; }
    gcPk.icon=data;
    var b=document.getElementById('gcPkIcon'); if(b){ b.style.backgroundImage='url("'+data+'")'; b.textContent=''; }
  });
  input.value='';
}
function gcPkSubmit(){
  if(gcPk.busy||!gcK()) return;
  var create=gcPk.mode==='create', uids=Object.keys(gcPk.picked);
  var nameEl=document.getElementById('gcPkName'), name=create?((nameEl&&nameEl.value)||'').trim().slice(0,40):gcPk.gname;
  if(create&&!name){ gcPkMsg('Give the group a name.'); return; }
  if(!uids.length){ gcPkMsg('Pick at least one person.'); return; }
  gcPk.busy=true; gcPkFill();
  var start=create?gcK().gcCreate(name,gcPk.icon):Promise.resolve(gcPk.gid);
  start.then(function(gid){
    var added=0, invited=0, failed=0;
    var chain=Promise.resolve();
    uids.forEach(function(u){
      chain=chain.then(function(){
        return gcK().gcAddMember(gid,u,name).then(function(r){ if(r==='invited') invited++; else added++; }).catch(function(){ failed++; });
      });
    });
    return chain.then(function(){ return {gid:gid,added:added,invited:invited,failed:failed}; });
  }).then(function(res){
    gcPk.busy=false; gcPkClose();
    var notes=[];
    if(res.invited) notes.push(res.invited+' '+(res.invited===1?'person has':'people have')+' turned off adding to groups, so they were sent an invite instead. They\'ll see it under Requests.');
    if(res.failed) notes.push(res.failed+' could not be added (they may not exist, or the group is full).');
    if(create){ dmTab='chats'; gcOpen(res.gid); }
    if(notes.length) ksAlert(notes.join('\n\n'));
  }).catch(function(){
    gcPk.busy=false; gcPkFill();
    gcPkMsg(create?'Could not create the group. Make sure you have a username and try again.':'Could not add people. Please try again.');
  });
}


/* ───────────── Group extras (v6): WhatsApp-style avatars beside messages, crop for group pictures ───────────── */
(function(){
  if(!document.getElementById('gcV6Css')){
    var st=document.createElement('style'); st.id='gcV6Css';
    st.textContent='.gc-mrow{display:flex;align-items:flex-end;gap:8px;align-self:flex-start;width:fit-content;max-width:94%;margin:4px 0}'
      +'.gc-mrow .ks-chat-avatar{flex:none;margin-bottom:2px;cursor:pointer}'
      +'.gc-mrow .ks-bubble{margin:0!important;max-width:calc(100% - 42px)!important;min-width:0}';
    document.head.appendChild(st);
  }
  /* the same drag + zoom + rotate cropper the profile picture uses */
  if(window.__ksCropWrap){ window.__ksCropWrap('gcInfoPickIcon'); window.__ksCropWrap('gcPkPickIcon'); }
})();
