/* alio-builder-edit.js — the Builder page editor (owner only).
   Loaded by index.html only when the owner taps "Edit this page", so normal visitors never download it.
   Limits: up to 30 sections, each with up to 30 subsections, 5000 characters per section text and per subsection text. */
(function(){
'use strict';
var SEC_MAX=30, SUB_MAX=30, BODY_MAX=5000, LNK_MAX=8;
var M=null, box=null;

function E(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

function css(){
  if(document.getElementById('bpe-css')) return;
  var s=document.createElement('style'); s.id='bpe-css';
  s.textContent=
  '.bpe{max-width:760px;margin:0 auto;padding:6px 0 110px}'
  +'.bpe h2{margin:6px 0 4px}.bpe .bpe-lead{color:var(--muted);font-size:13.5px;line-height:1.55;margin:0 0 14px}'
  +'.bpe-card{border:1px solid var(--border);border-radius:14px;padding:14px;margin:12px 0;background:var(--surface)}'
  +'.bpe-card>h3{margin:0 0 4px;font-size:16px}'
  +'.bpe-f{margin:12px 0 0}.bpe-f label{display:block;font-weight:700;font-size:13px;margin-bottom:4px}'
  +'.bpe-f input,.bpe-f textarea{width:100%;box-sizing:border-box}.bpe-f textarea{resize:vertical;min-height:90px}'
  +'.bpe-f small{display:block;color:var(--muted);font-size:12px;margin-top:3px;line-height:1.45}'
  +'.bpe-sec{border:1px solid var(--border);border-radius:14px;margin:10px 0;background:var(--surface);overflow:hidden}'
  +'.bpe-sh{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 0}'
  +'.bpe-tg{flex:1;min-width:0;text-align:left;background:none;border:0;color:inherit;font:inherit;font-weight:700;padding:12px 14px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
  +'.bpe-tg::after{content:" ▾";color:var(--muted)}.bpe-sec.open>.bpe-sh .bpe-tg::after{content:" ▴"}'
  +'.bpe-mv{display:flex;gap:6px;flex:none}.bpe-mv button{min-width:36px;height:34px;border:1px solid var(--border);background:transparent;color:inherit;border-radius:8px;cursor:pointer}'
  +'.bpe-sb{display:none;padding:0 14px 14px;border-top:1px solid var(--border)}.bpe-sec.open>.bpe-sb{display:block}'
  +'.bpe-subs{margin-top:18px}.bpe-subs>h4{margin:0 0 6px;font-size:14px}'
  +'.bpe-sub{border:1px dashed var(--border);border-radius:12px;padding:10px 12px 12px;margin:10px 0}'
  +'.bpe-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}'
  +'.bpe-sm{padding:6px 12px!important;font-size:12.5px!important}'
  +'.bpe-bar{position:sticky;bottom:0;z-index:5;background:var(--surface);border-top:1px solid var(--border);padding:10px 4px calc(10px + env(safe-area-inset-bottom,0px));display:flex;gap:10px;align-items:center;flex-wrap:wrap}'
  +'.bpe-bar #bpMsg{flex:1 1 200px;font-size:13px;line-height:1.4}'
  +'.bpe-rl{display:grid;gap:8px;border:1px solid var(--border);border-radius:12px;padding:10px;margin:8px 0}';
  document.head.appendChild(s);
}

function F(label,path,val,max,rows,ph,hint){
  val=val==null?'':String(val);
  var a=' data-p="'+path+'" data-max="'+max+'" maxlength="'+max+'" placeholder="'+E(ph||'')+'"';
  var el=rows?'<textarea class="ks-input" rows="'+rows+'"'+a+'>'+E(val)+'</textarea>':'<input class="ks-input"'+a+' value="'+E(val)+'">';
  return '<div class="bpe-f"><label>'+E(label)+'</label>'+el+'<small class="bpe-c">'+Math.max(0,max-val.length)+' characters left</small>'+(hint?'<small>'+hint+'</small>':'')+'</div>';
}
var TIP='Tip: leave a blank line for a new paragraph. Start every line with "- " to make a bullet list.';

function subHTML(u,i,j,n){
  var p='secs.'+i+'.s.'+j;
  return '<div class="bpe-sub"><div class="bpe-row" style="margin-top:0"><strong style="flex:1">Subsection '+(j+1)+'</strong>'
    +'<span class="bpe-mv"><button type="button" data-a="subup" data-i="'+i+'" data-j="'+j+'" aria-label="Move up">▲</button><button type="button" data-a="subdn" data-i="'+i+'" data-j="'+j+'" aria-label="Move down">▼</button></span></div>'
    +F('Subsection heading',p+'.t',u.t,80,0,'e.g. MediCush')
    +F('Subsection text',p+'.b',u.b,BODY_MAX,6,'Text for this subsection',TIP)
    +F('Optional link button',p+'.l',u.l,200,0,'https://… (leave empty for none)')
    +'<div class="bpe-row"><button type="button" class="btn btn-ghost bpe-sm" data-a="subrm" data-i="'+i+'" data-j="'+j+'">Remove subsection</button></div></div>';
}

function secHTML(s,i){
  var subs=(s.s||[]).map(function(u,j){ return subHTML(u,i,j,s.s.length); }).join('');
  var nm=(s.t&&s.t.trim())||'Untitled section', cnt=(s.s||[]).length;
  return '<div class="bpe-sec'+(s._o?' open':'')+'" data-i="'+i+'">'
    +'<div class="bpe-sh"><button type="button" class="bpe-tg" data-a="tog" data-i="'+i+'">'+(i<9?'0':'')+(i+1)+' · '+E(nm)+'</button>'
    +'<span class="bpe-mv"><button type="button" data-a="secup" data-i="'+i+'" aria-label="Move section up">▲</button><button type="button" data-a="secdn" data-i="'+i+'" aria-label="Move section down">▼</button></span></div>'
    +'<div class="bpe-sb">'
    +F('Section heading','secs.'+i+'.t',s.t,80,0,'e.g. What I build')
    +F('Section text','secs.'+i+'.b',s.b,BODY_MAX,9,'Text for this section',TIP)
    +'<div class="bpe-subs"><h4>Subsections ('+cnt+' of '+SUB_MAX+')</h4>'+subs
    +'<div class="bpe-row"><button type="button" class="btn btn-secondary bpe-sm" data-a="subadd" data-i="'+i+'">+ Add subsection</button></div></div>'
    +'<div class="bpe-row" style="margin-top:18px"><button type="button" class="btn btn-ghost bpe-sm" data-a="secrm" data-i="'+i+'">Remove this whole section</button></div>'
    +'</div></div>';
}

function lnkHTML(r,k){
  return '<div class="bpe-rl"><div class="bpe-f" style="margin:0"><label>Button name</label><input class="ks-input" data-p="lnk.'+k+'.l" data-max="40" maxlength="40" placeholder="e.g. YouTube" value="'+E(r.l)+'"></div>'
    +'<div class="bpe-f" style="margin:0"><label>Link</label><input class="ks-input" data-p="lnk.'+k+'.u" data-max="200" maxlength="200" inputmode="url" autocapitalize="none" autocomplete="off" placeholder="https://…" value="'+E(r.u)+'"></div>'
    +'<div class="bpe-row" style="margin:0"><button type="button" class="btn btn-ghost bpe-sm" data-a="lnkrm" data-k="'+k+'">Remove button</button></div></div>';
}

function render(){
  var y=window.scrollY||0;
  box.innerHTML='<div class="bpe">'
  +'<h2>Edit the Builder page</h2><p class="bpe-lead">Everything here is saved to the database and shown to everyone when you press Save. Each section and each subsection can hold up to '+BODY_MAX+' characters. You can have up to '+SEC_MAX+' sections, each with up to '+SUB_MAX+' subsections. Empty ones are simply not shown.</p>'
  +'<div class="bpe-card"><h3>Top of the page</h3>'
  +F('Small label above your name','eyebrow',M.eyebrow,40,0,'The builder')
  +F('Greeting','greeting',M.greeting,60,0,'Hello, I am')
  +F('Your name','name',M.name,80,0,'')
  +F('Line under your name','headline',M.headline,160,0,'')
  +F('Introduction (the big text at the top)','bio',M.bio,BODY_MAX,12,'',TIP)
  +'</div>'
  +'<h3 style="margin:18px 0 0">Sections ('+M.secs.length+' of '+SEC_MAX+')</h3>'
  +M.secs.map(secHTML).join('')
  +'<div class="bpe-row"><button type="button" class="btn btn-secondary" data-a="secadd">+ Add section</button></div>'
  +'<div class="bpe-card"><h3>Contact area</h3>'
  +F('Heading','connectTitle',M.connectTitle,60,0,"Let's connect")
  +F('Text','connectText',M.connectText,1000,5,'')
  +F('Instagram link','ig',M.ig,200,0,'https://instagram.com/…')
  +F('Email address','email',M.email,120,0,'name@example.com')
  +'<div class="bpe-f"><label>More buttons ('+M.lnk.length+' of '+LNK_MAX+')</label></div>'
  +M.lnk.map(lnkHTML).join('')
  +'<div class="bpe-row"><button type="button" class="btn btn-secondary bpe-sm" data-a="lnkadd">+ Add button</button></div></div>'
  +'<div class="bpe-card"><h3>Footer</h3>'+F('Footer text','footer',M.footer,400,4,'',TIP)+'</div>'
  +'<div class="bpe-row"><button type="button" class="btn btn-ghost" data-a="reset">Reset the whole page to the built-in text</button></div>'
  +'<div class="bpe-bar"><button type="button" class="btn btn-primary" data-a="save">Save</button><div id="bpMsg"></div></div>'
  +'</div>';
  window.scrollTo(0,y);
}

function getP(path){ var o=M, a=path.split('.'); for(var i=0;i<a.length;i++){ if(o==null) return ''; o=o[a[i]]; } return o; }
function setP(path,v){ var o=M, a=path.split('.'); for(var i=0;i<a.length-1;i++){ o=o[a[i]]; } o[a[a.length-1]]=v; }
function say(t,bad){ if(window.bpSay) window.bpSay(t,bad); else { var e=document.getElementById('bpMsg'); if(e){ e.textContent=t; e.style.color=bad?'#FF5A5A':'#3ddc97'; } } }
function dirty(){ window.bpDirty=true; }
function swap(arr,a,b){ if(b<0||b>=arr.length) return false; var t=arr[a]; arr[a]=arr[b]; arr[b]=t; return true; }

function onInput(e){
  var el=e.target; if(!el||!el.getAttribute) return;
  var p=el.getAttribute('data-p'); if(!p) return;
  setP(p,el.value); dirty();
  var c=el.parentNode.querySelector('.bpe-c');
  if(c) c.textContent=Math.max(0,(+el.getAttribute('data-max')||0)-el.value.length)+' characters left';
  var m=/^secs\.(\d+)\.t$/.exec(p);
  if(m){ var t=el.closest('.bpe-sec').querySelector('.bpe-tg'); var i=+m[1]; t.textContent=(i<9?'0':'')+(i+1)+' · '+(el.value.trim()||'Untitled section'); }
}

function onClick(e){
  var b=e.target.closest&&e.target.closest('[data-a]'); if(!b||!box.contains(b)) return;
  var a=b.getAttribute('data-a'), i=+b.getAttribute('data-i'), j=+b.getAttribute('data-j'), k=+b.getAttribute('data-k');
  if(a==='tog'){ var s=b.closest('.bpe-sec'); s.classList.toggle('open'); M.secs[i]._o=s.classList.contains('open'); return; }
  if(a==='secadd'){ if(M.secs.length>=SEC_MAX) return say('You can have up to '+SEC_MAX+' sections.',true); M.secs.push({t:'',b:'',s:[],_o:true}); dirty(); render(); return; }
  if(a==='secrm'){ if(!confirm('Remove this whole section and its subsections?')) return; M.secs.splice(i,1); dirty(); render(); return; }
  if(a==='secup'){ if(swap(M.secs,i,i-1)){ dirty(); render(); } return; }
  if(a==='secdn'){ if(swap(M.secs,i,i+1)){ dirty(); render(); } return; }
  if(a==='subadd'){ var S=M.secs[i]; S.s=S.s||[]; if(S.s.length>=SUB_MAX) return say('A section can have up to '+SUB_MAX+' subsections.',true); S.s.push({t:'',b:'',l:''}); S._o=true; dirty(); render(); return; }
  if(a==='subrm'){ if(!confirm('Remove this subsection?')) return; M.secs[i].s.splice(j,1); dirty(); render(); return; }
  if(a==='subup'){ if(swap(M.secs[i].s,j,j-1)){ dirty(); render(); } return; }
  if(a==='subdn'){ if(swap(M.secs[i].s,j,j+1)){ dirty(); render(); } return; }
  if(a==='lnkadd'){ if(M.lnk.length>=LNK_MAX) return say('You can have up to '+LNK_MAX+' extra buttons.',true); M.lnk.push({l:'',u:''}); dirty(); render(); return; }
  if(a==='lnkrm'){ M.lnk.splice(k,1); dirty(); render(); return; }
  if(a==='save') return save();
  if(a==='reset') return reset();
}

function save(){
  if(!window.KSFirebase||!KSFirebase.saveBuilderV2) return say('Not connected to the database.',true);
  var bad=[], links=[];
  M.lnk.forEach(function(r){
    var l=String(r.l||'').replace(/[|\n]/g,' ').trim(), raw=String(r.u||'').trim(); if(!l&&!raw) return;
    var u=bpNormUrl(raw); if(!bpUrl(u)){ bad.push(l||raw); return; }
    links.push((l||bpHost(u))+' | '+u);
  });
  var badSub=[];
  var secs=M.secs.map(function(s){
    return {t:s.t||'',b:s.b||'',s:(s.s||[]).map(function(u){
      var l=String(u.l||'').trim(); if(l){ l=bpNormUrl(l); if(!bpUrl(l)){ badSub.push(u.t||String(u.l)); l=''; } }
      return {t:u.t||'',b:u.b||'',l:l}; })};
  });
  if(badSub.length) return say('These subsection links are not valid (they must be web addresses like https://…): '+badSub.join(', '),true);
  var ig=bpNormUrl(M.ig)||String(M.ig||'').trim();
  var main={eyebrow:String(M.eyebrow||'').trim(),greeting:String(M.greeting||'').trim(),name:M.name,headline:M.headline,bio:M.bio,
    email:M.email,ig:ig,links:links.join('\n'),connectTitle:M.connectTitle,connectText:M.connectText,footer:M.footer};
  say('Saving…');
  KSFirebase.saveBuilderV2(main,secs).then(function(clean){
    if(window.bpApplySaved) bpApplySaved(main,clean);
    window.bpDirty=false;
    say(bad.length?'✅ Saved, but these buttons were skipped because the link is not valid: '+bad.join(', '):'✅ Saved. Everyone sees it now.',!!bad.length);
  }).catch(function(err){
    var m=(err&&err.message)||String(err);
    if(err&&err.code==='permission-denied') m='The database does not allow this yet. Firestore rules need to let your owner account write to the builderProfile collection (all documents in it, not only "main").';
    say('Could not save: '+m,true);
  });
}

function reset(){
  if(!confirm('Reset the whole page to the built-in text? Your saved version will be deleted.')) return;
  KSFirebase.resetBuilder().then(function(){
    if(window.bpApplySaved) bpApplySaved(null,null);
    window.bpDirty=false; init(); say('✅ Back to the built-in text.');
  }).catch(function(err){ say('Could not reset: '+((err&&err.message)||err),true); });
}

function init(){
  M=window.bpModel();
  M.lnk=window.bpParseLinks(M.links).map(function(r){ return {l:r.l,u:r.u}; });
  if(M.secs.length&&!M.secs.some(function(s){return s._o;})) M.secs[0]._o=true;
  render();
}

window.bpRenderEditor=function(el){
  box=el; css();
  if(!box.__bpe){ box.__bpe=1; box.addEventListener('input',onInput); box.addEventListener('click',onClick); }
  init();
};
})();
