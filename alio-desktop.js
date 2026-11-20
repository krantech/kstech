/* Alio Aurora Desktop (loaded only when the Aurora Desktop theme is used on a wide screen). Upload next to index.html. */
(function(){ if(window.__KS_EMBED||document.getElementById('ksdCss')) return; var s=document.createElement('style'); s.id='ksdCss'; s.textContent="/* ---------- desktop is on: normal Alio page chrome is replaced by the desktop ---------- */\nhtml.ks-aurora-on,html.ks-aurora-on body{overflow:hidden!important;height:100%!important}\nhtml.ks-aurora-on:root #app,html.ks-aurora-on:root .navbar,html.ks-aurora-on:root .nav-mobile-menu,html.ks-aurora-on:root .nav-more-menu,\nhtml.ks-aurora-on:root #ksBottomBar,html.ks-aurora-on:root #ksBbarHandle,html.ks-aurora-on:root #ksChatFab,html.ks-aurora-on:root #announcementStack,\nhtml.ks-aurora-on:root canvas#stars,html.ks-aurora-on:root .ks-row-bbar,html.ks-aurora-on:root .ks-row-bbaredit,html.ks-aurora-on:root #cfbBgLayer,html.ks-aurora-on:root #cfbBgDim{display:none!important}\n\n#ksDesk{--g:rgba(34,34,40,.58);--g2:rgba(255,255,255,.09);--tx:#f5f5f7;--dim:rgba(245,245,247,.62);--ln:rgba(255,255,255,.13);\n  --win:#1b1b20;--head:rgba(40,40,46,.96);--pill:rgba(255,255,255,.12);--pillb:rgba(255,255,255,.22);--dockg:rgba(34,34,42,.36);--dockb:rgba(255,255,255,.26);--acc:var(--accent,#7c6bff);--sh:0 22px 64px rgba(0,0,0,.5),0 0 0 .5px rgba(255,255,255,.16);\n  position:fixed;inset:0;z-index:60;overflow:hidden;color:var(--tx);user-select:none;-webkit-user-select:none;\n  font:13px/1.4 -apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"Inter\",\"Segoe UI\",system-ui,sans-serif;letter-spacing:-.005em;-webkit-font-smoothing:antialiased}\nhtml[data-theme=\"light\"] #ksDesk{--g:rgba(250,250,253,.66);--g2:rgba(0,0,0,.06);--tx:#1d1d1f;--dim:rgba(29,29,31,.6);--ln:rgba(0,0,0,.12);\n  --win:#fff;--head:rgba(246,246,249,.97);--pill:rgba(255,255,255,.7);--pillb:rgba(0,0,0,.1);--dockg:rgba(255,255,255,.32);--dockb:rgba(255,255,255,.55);--sh:0 22px 64px rgba(25,35,70,.3),0 0 0 .5px rgba(0,0,0,.2)}\n:where(#ksDesk) *{box-sizing:border-box}\n:where(#ksDesk) button{font:inherit;color:inherit;background:none;border:0;cursor:default;padding:0}\n#ksDesk .ksd-blur{-webkit-backdrop-filter:blur(26px) saturate(1.7);backdrop-filter:blur(26px) saturate(1.7)}\n#ksDesk.solid .ksd-blur{-webkit-backdrop-filter:none;backdrop-filter:none}\n#ksDesk :focus-visible{outline:2px solid var(--acc);outline-offset:2px}\n\n/* wallpaper */\n.ksd-wall{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity .5s}\n.ksd-wall.photo{background-repeat:no-repeat}\n.wp0{background:radial-gradient(120% 80% at 12% 0,#3b4290 0,transparent 55%),radial-gradient(90% 70% at 100% 15%,#6e3f86 0,transparent 55%),radial-gradient(130% 70% at 50% 125%,#d0714e 0,transparent 62%),linear-gradient(#0e1126,#191430)}\n.wp1{background:radial-gradient(100% 80% at 20% 0,#fff 0,transparent 60%),radial-gradient(100% 90% at 95% 100%,#9dc3ff 0,transparent 60%),linear-gradient(#dde7f7,#c3d4ef)}\n.wp2{background:radial-gradient(100% 80% at 30% 0,#50535e 0,transparent 60%),radial-gradient(90% 70% at 95% 100%,#2d3242 0,transparent 60%),#16171b}\n.wp3{background:radial-gradient(110% 80% at 85% 0,#df8a4e 0,transparent 55%),radial-gradient(100% 80% at 0 100%,#7b2b4b 0,transparent 60%),linear-gradient(#2a1226,#4a1e33)}\n.wp4{background:radial-gradient(110% 80% at 20% 0,#1f8f7a 0,transparent 55%),radial-gradient(90% 70% at 100% 30%,#3b5bb5 0,transparent 55%),radial-gradient(120% 70% at 50% 120%,#7a4fa3 0,transparent 60%),linear-gradient(#08161f,#0d1f2b)}\n.wp5{background:radial-gradient(110% 80% at 80% 0,#3fa7d6 0,transparent 55%),radial-gradient(110% 80% at 0 100%,#0b3a6b 0,transparent 60%),linear-gradient(#0a2a4a,#0e4a78)}\n.wp6{background:radial-gradient(100% 80% at 80% 0,#fff2dc 0,transparent 60%),radial-gradient(100% 90% at 10% 100%,#e8b48a 0,transparent 60%),linear-gradient(#f0dcc4,#e2c3a0)}\n.wp7{background:radial-gradient(100% 80% at 15% 0,#c56bd6 0,transparent 55%),radial-gradient(100% 80% at 100% 100%,#3a3fa8 0,transparent 60%),linear-gradient(#1c1030,#2a1550)}\n.wp8{background:radial-gradient(110% 80% at 15% 0,#8be0a4 0,transparent 55%),radial-gradient(100% 80% at 100% 90%,#2c8c8a 0,transparent 60%),linear-gradient(#0d2a2a,#14463f)}\n.wp9{background:radial-gradient(110% 80% at 80% 0,#ffd2c2 0,transparent 55%),radial-gradient(100% 90% at 0 100%,#f08fb0 0,transparent 60%),linear-gradient(#ffe3d6,#f7b8c8)}\n.wp10{background:radial-gradient(100% 70% at 70% 0,#2a3a8c 0,transparent 60%),radial-gradient(120% 70% at 20% 110%,#1a1f4a 0,transparent 65%),linear-gradient(#05060f,#0b0e24)}\n.wp11{background:radial-gradient(100% 80% at 25% 0,#e4fff3 0,transparent 60%),radial-gradient(100% 90% at 95% 100%,#a8e6d0 0,transparent 60%),linear-gradient(#e8f8f1,#cdeedf)}\n\n/* menu bar */\n#ksdBar{position:absolute;left:0;right:0;top:0;height:30px;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:0 8px;\n  background:var(--g);border-bottom:1px solid var(--ln);font-size:13px;font-weight:500}\n#ksdBar .l,#ksdBar .r{display:flex;align-items:center;gap:2px;min-width:0}\n#ksdBar .mb{height:24px;padding:0 9px;border-radius:6px;display:flex;align-items:center;gap:6px;white-space:nowrap;position:relative}\n#ksdBar .mb:hover,#ksdBar .mb.open{background:var(--g2)}\n#ksdBar .mb.app{font-weight:700}\n#ksdBar .logo{width:18px;height:18px;border-radius:5px;background:linear-gradient(135deg,var(--acc),#ff8ad0);display:grid;place-items:center;color:#fff;font-weight:800;font-size:11px}\n#ksdBar .mb .bd{position:absolute;top:1px;right:1px;min-width:14px;height:14px;border-radius:7px;background:#ef4444;color:#fff;font-size:9px;font-weight:700;display:grid;place-items:center;padding:0 3px}\n#ksdBar svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}\n#ksdBar .av{width:20px;height:20px;border-radius:50%;background:var(--g2) center/cover;display:grid;place-items:center;font-size:11px;font-weight:700}\n#ksdBar .clock{font-variant-numeric:tabular-nums}\n\n/* popup menus */\n.ksd-menu{position:fixed;z-index:200;min-width:210px;padding:5px;border-radius:11px;background:var(--g);border:1px solid var(--ln);\n  box-shadow:0 18px 50px rgba(0,0,0,.4);animation:ksdPop .14s ease-out;transform-origin:top left;color:var(--tx);font:13px/1.35 -apple-system,\"Segoe UI\",system-ui,sans-serif}\n.ksd-menu .it{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:6px;white-space:nowrap}\n.ksd-menu .it:hover:not(.off){background:var(--acc);color:#fff}\n.ksd-menu .it.off{opacity:.42}\n.ksd-menu .it .k{margin-left:auto;opacity:.55;font-size:11.5px;padding-left:18px}\n.ksd-menu .it .ck{width:12px;text-align:center}\n.ksd-menu .sep{height:1px;background:var(--ln);margin:5px 6px}\n.ksd-menu .hd{padding:5px 10px 3px;font-size:11px;opacity:.55;font-weight:600;letter-spacing:.02em}\n.ksd-menu.cc{width:300px;padding:12px}\n.ksd-menu.cc .row{margin-bottom:12px}\n.ksd-menu.cc .lb{font-size:11.5px;font-weight:600;opacity:.65;margin-bottom:6px}\n.ksd-seg{display:flex;gap:3px;background:var(--g2);padding:3px;border-radius:9px}\n.ksd-seg button{flex:1;padding:6px 4px;border-radius:7px;font-weight:600;font-size:12px}\n.ksd-seg button.on{background:var(--acc);color:#fff}\n.ksd-menu input[type=range]{width:100%;accent-color:var(--acc)}\n.ksd-menu .tg{display:flex;justify-content:space-between;align-items:center;padding:4px 0}\n@keyframes ksdPop{from{opacity:0;transform:scale(.96) translateY(-4px)}to{opacity:1;transform:none}}\n\n/* windows */\n.ksd-wins{position:absolute;left:0;right:0;top:30px;bottom:0;z-index:10;pointer-events:none}\n.ksd-win{position:absolute;pointer-events:auto;display:flex;flex-direction:column;border-radius:12px;background:var(--win);box-shadow:var(--sh);overflow:visible;\n  min-width:340px;min-height:240px;transform-origin:50% 60%}\n.ksd-win.opening{animation:ksdIn .26s cubic-bezier(.2,.9,.25,1.15) both}\n.ksd-win.closing{animation:ksdOut .18s ease-in both;pointer-events:none}\n.ksd-win.min{transform:translate(var(--mx,0px),var(--my,300px)) scale(.1);opacity:0;pointer-events:none;transition:transform .32s cubic-bezier(.55,0,.75,.35),opacity .28s ease-in}\n.ksd-win.hid{visibility:hidden}\n.ksd-win.anim{transition:left .24s cubic-bezier(.3,.8,.3,1),top .24s cubic-bezier(.3,.8,.3,1),width .24s cubic-bezier(.3,.8,.3,1),height .24s cubic-bezier(.3,.8,.3,1),border-radius .2s}\n.ksd-win.max{border-radius:0;box-shadow:none}\n.ksd-win:not(.focus){box-shadow:0 10px 34px rgba(0,0,0,.3),0 0 0 .5px var(--ln)}\n@keyframes ksdIn{from{opacity:0;transform:scale(.9) translateY(14px)}to{opacity:1;transform:none}}\n@keyframes ksdOut{to{opacity:0;transform:scale(.93)}}\n.ksd-in{position:absolute;inset:0;border-radius:inherit;overflow:hidden;display:flex;flex-direction:column;background:var(--win)}\n.ksd-head{height:40px;flex:none;display:flex;align-items:center;gap:9px;padding:0 6px 0 14px;background:var(--head);border-bottom:1px solid var(--ln);touch-action:none}\n.ksd-win:not(.focus) .ksd-head{opacity:.78}\n.ksd-head .ic{width:20px;height:20px;border-radius:6px;display:grid;place-items:center;font-size:12px;flex:none}\n.ksd-head .tt{flex:1;min-width:0;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.ksd-ctl{display:flex;align-items:center;flex:none;gap:6px;padding-right:4px}\n.ksd-ctl button{width:36px;height:22px;border-radius:11px;display:grid;place-items:center;color:var(--tx);\n  background:var(--pill);border:1px solid var(--pillb);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 1px 4px rgba(0,0,0,.16);\n  -webkit-backdrop-filter:blur(12px) saturate(1.6);backdrop-filter:blur(12px) saturate(1.6);transition:background .15s,color .15s,transform .12s,box-shadow .15s}\n.ksd-ctl button svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}\n.ksd-ctl button:hover{transform:translateY(-.5px)}\n.ksd-ctl .bm:hover{background:rgba(254,188,46,.75);color:#4a3200;border-color:rgba(254,188,46,.9)}\n.ksd-ctl .bx:hover{background:rgba(40,200,64,.7);color:#052b0d;border-color:rgba(40,200,64,.9)}\n.ksd-ctl .bc:hover{background:rgba(255,80,70,.9);color:#fff;border-color:rgba(255,80,70,1);box-shadow:0 0 12px rgba(255,80,70,.5)}\n.ksd-win:not(.focus) .ksd-ctl button{opacity:.55}\n.ksd-body{position:relative;flex:1;min-height:0;background:var(--win)}\n.ksd-body iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:var(--win);opacity:0;transition:opacity .25s}\n.ksd-body iframe.ld{opacity:1}\n.ksd-body .nat{position:absolute;inset:0;overflow:auto}\n.ksd-spin{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px;border-radius:50%;border:3px solid var(--g2);border-top-color:var(--acc);animation:ksdSp .8s linear infinite}\n@keyframes ksdSp{to{transform:rotate(360deg)}}\n.ksd-shield{position:absolute;inset:0;z-index:3;display:none}\n.ksd-wins.drag .ksd-shield{display:block}\n.ksd-rz{position:absolute;z-index:6}\n.ksd-rz[data-d=n]{top:-4px;left:12px;right:12px;height:9px;cursor:ns-resize}.ksd-rz[data-d=s]{bottom:-4px;left:12px;right:12px;height:9px;cursor:ns-resize}\n.ksd-rz[data-d=w]{left:-4px;top:12px;bottom:12px;width:9px;cursor:ew-resize}.ksd-rz[data-d=e]{right:-4px;top:12px;bottom:12px;width:9px;cursor:ew-resize}\n.ksd-rz[data-d=nw]{left:-5px;top:-5px;width:16px;height:16px;cursor:nwse-resize}.ksd-rz[data-d=se]{right:-5px;bottom:-5px;width:16px;height:16px;cursor:nwse-resize}\n.ksd-rz[data-d=ne]{right:-5px;top:-5px;width:16px;height:16px;cursor:nesw-resize}.ksd-rz[data-d=sw]{left:-5px;bottom:-5px;width:16px;height:16px;cursor:nesw-resize}\n.ksd-win.max .ksd-rz,.ksd-win.snp .ksd-rz{display:none}\n.ksd-snap{position:absolute;z-index:9;border-radius:12px;background:color-mix(in srgb,var(--acc) 26%,transparent);border:2px solid var(--acc);opacity:0;pointer-events:none;transition:all .16s ease-out}\n.ksd-snap.on{opacity:1}\n.ksd-flyout{position:fixed;z-index:210;padding:8px;border-radius:12px;background:var(--g);border:1px solid var(--ln);box-shadow:0 18px 50px rgba(0,0,0,.4);animation:ksdPop .14s ease-out;\n  display:grid;grid-template-columns:repeat(3,52px);gap:6px}\n.ksd-flyout button{height:36px;border-radius:7px;background:var(--g2);position:relative;overflow:hidden}\n.ksd-flyout button i{position:absolute;background:var(--acc);border-radius:2px;opacity:.85}\n.ksd-flyout button:hover{box-shadow:inset 0 0 0 1.5px var(--acc)}\n\n/* dock */\n#ksdDockWrap{position:absolute;left:0;right:0;bottom:8px;z-index:30;display:flex;justify-content:center;pointer-events:none;transition:transform .38s cubic-bezier(.3,.8,.3,1),opacity .3s}\n#ksdDockWrap.hide{transform:translateY(calc(100% + 14px));opacity:.0}\n#ksdDock{pointer-events:auto;display:flex;align-items:flex-end;gap:5px;padding:7px 9px;border-radius:24px;background:var(--dockg);border:1px solid var(--dockb);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 16px 48px rgba(0,0,0,.34);-webkit-backdrop-filter:blur(34px) saturate(1.9);backdrop-filter:blur(34px) saturate(1.9);max-width:calc(100vw - 20px)}\n#ksdHot{position:absolute;left:20%;right:20%;bottom:0;height:8px;z-index:29}\n.ksd-dk{position:relative;flex:none;display:flex;align-items:flex-end;justify-content:center;transition:margin .12s}\n.ksd-dk .ti{width:100%;aspect-ratio:1;border-radius:23%;display:grid;place-items:center;box-shadow:0 5px 14px rgba(0,0,0,.35),inset 0 0 0 .5px rgba(255,255,255,.22),inset 0 1px 0 rgba(255,255,255,.28);color:#fff;overflow:hidden}\n.ksd-dk .ti span{font-size:calc(var(--w,52px)*.5);line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}\n.ksd-dk .dot{position:absolute;bottom:-5px;left:50%;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--tx);opacity:0}\n.ksd-dk.run .dot{opacity:.85}\n.ksd-dk.dim{opacity:.4}\n.ksd-dk .bd{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;border-radius:9px;background:#ef4444;color:#fff;font-size:10.5px;font-weight:700;display:grid;place-items:center;padding:0 4px;box-shadow:0 2px 6px rgba(0,0,0,.4)}\n.ksd-dk .lb{position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%) translateY(4px);padding:4px 10px;border-radius:7px;background:var(--g);border:1px solid var(--ln);font-size:12px;font-weight:600;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s,transform .12s;-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px)}\n.ksd-dk:hover .lb{opacity:1;transform:translateX(-50%)}\n.ksd-dk.bounce .ti{animation:ksdBounce .6s ease-out 2}\n.ksd-dk.drg{z-index:5;transition:none}.ksd-dk.drg .ti{opacity:.8}\n@keyframes ksdBounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-18px)}}\n.ksd-dsep{width:1px;align-self:stretch;margin:4px 3px;background:var(--ln)}\n\n/* desktop icons */\n.ksd-icons{position:absolute;left:0;right:0;top:30px;bottom:0;z-index:5}\n.ksd-di{position:absolute;width:92px;height:96px;display:flex;flex-direction:column;align-items:center;gap:5px;padding:6px 4px;border-radius:10px;text-align:center;touch-action:none}\n.ksd-di .ti{width:54px;height:54px;border-radius:23%;display:grid;place-items:center;color:#fff;box-shadow:0 5px 14px rgba(0,0,0,.35),inset 0 0 0 .5px rgba(255,255,255,.22),inset 0 1px 0 rgba(255,255,255,.28)}\n.ksd-di .ti span{font-size:28px;line-height:1}\n.ksd-di .nm{font-size:12px;font-weight:600;line-height:1.2;max-width:88px;max-height:30px;overflow:hidden;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7),0 0 1px rgba(0,0,0,.6);padding:1px 5px;border-radius:5px}\n.ksd-di.sel{background:rgba(255,255,255,.2)}\n.ksd-di.sel .nm{background:var(--acc);text-shadow:none}\n.ksd-di.drg{opacity:.85;z-index:8}\n\n/* overlays: spotlight, launchpad, overview */\n.ksd-ov{position:absolute;inset:0;z-index:100;opacity:0;pointer-events:none;transition:opacity .22s}\n.ksd-ov.on{opacity:1;pointer-events:auto}\n.ksd-spot{position:absolute;left:50%;top:15vh;width:min(620px,92vw);transform:translateX(-50%) scale(.97);border-radius:16px;background:var(--g);border:1px solid var(--ln);box-shadow:0 30px 90px rgba(0,0,0,.5);overflow:hidden;transition:transform .2s}\n.ksd-ov.on .ksd-spot{transform:translateX(-50%)}\n.ksd-spot input{width:100%;height:54px;padding:0 20px;background:none;border:0;outline:0;font:500 19px/1 inherit;color:var(--tx);user-select:text;-webkit-user-select:text}\n.ksd-spot .res{max-height:min(48vh,420px);overflow:auto;border-top:1px solid var(--ln);padding:6px}\n.ksd-spot .res:empty{display:none}\n.ksd-spot .r{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:9px}\n.ksd-spot .r.sel{background:var(--acc);color:#fff}\n.ksd-spot .r .ti{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;font-size:17px;flex:none}\n.ksd-spot .r small{opacity:.65;display:block;font-size:11.5px}\n.ksd-spot .r .ct{margin-left:auto;font-size:11px;opacity:.55}\n.ksd-lp{background:rgba(10,10,16,.45);-webkit-backdrop-filter:blur(36px) saturate(1.5);backdrop-filter:blur(36px) saturate(1.5);display:flex;flex-direction:column;align-items:center;padding-top:7vh;overflow:auto}\nhtml[data-theme=\"light\"] .ksd-lp{background:rgba(240,242,250,.5)}\n.ksd-lp .sb{width:min(340px,80vw);height:36px;border-radius:10px;background:var(--g2);border:1px solid var(--ln);padding:0 14px;color:var(--tx);font:500 14px/1 inherit;outline:0;text-align:center;user-select:text;-webkit-user-select:text}\n.ksd-lp .grid{width:min(980px,94vw);display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:18px 8px;padding:28px 10px 120px}\n.ksd-lp .gl{grid-column:1/-1;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.55;margin:10px 4px 0}\n.ksd-lp .ap{display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 4px;border-radius:14px;text-align:center}\n.ksd-lp .ap:hover{background:var(--g2)}\n.ksd-lp .ap .ti{width:68px;height:68px;border-radius:23%;display:grid;place-items:center;color:#fff;box-shadow:0 7px 18px rgba(0,0,0,.35),inset 0 0 0 .5px rgba(255,255,255,.22),inset 0 1px 0 rgba(255,255,255,.28)}\n.ksd-lp .ap .ti span{font-size:34px;line-height:1}\n.ksd-lp .ap .n{font-size:12.5px;font-weight:600;line-height:1.2;max-width:104px}\n.ksd-lp .ap.dim{opacity:.42}\n.ksd-mc{background:rgba(8,8,14,.5);-webkit-backdrop-filter:blur(28px);backdrop-filter:blur(28px);display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:22px;padding:8vh 6vw}\n.ksd-mc .cd{width:250px;height:170px;border-radius:14px;background:var(--win);border:1px solid var(--ln);box-shadow:0 20px 50px rgba(0,0,0,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;position:relative;transition:transform .15s;color:var(--tx)}\n.ksd-mc .cd:hover{transform:scale(1.04);box-shadow:0 0 0 2px var(--acc),0 20px 50px rgba(0,0,0,.4)}\n.ksd-mc .cd .ti{width:60px;height:60px;border-radius:23%;display:grid;place-items:center;color:#fff}\n.ksd-mc .cd .ti span{font-size:30px;line-height:1}\n.ksd-mc .cd b{font-size:14px}\n.ksd-mc .cd .x{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;background:var(--g2);display:grid;place-items:center;font-size:12px}\n.ksd-mc .em{color:#fff;font-size:15px;opacity:.8;align-self:center}\n.ksd-toast{position:absolute;left:50%;bottom:110px;transform:translateX(-50%) translateY(10px);z-index:300;padding:11px 18px;border-radius:12px;background:var(--g);border:1px solid var(--ln);box-shadow:0 14px 40px rgba(0,0,0,.4);font-weight:600;opacity:0;transition:all .25s;pointer-events:none;max-width:90vw;text-align:center}\n.ksd-toast.on{opacity:1;transform:translateX(-50%)}\n.ksd-bounceAll{animation:ksdShake .35s}\n@keyframes ksdShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}\n\n/* native Settings window */\n.ksd-set{display:flex;height:100%;color:var(--tx);user-select:text;-webkit-user-select:text}\n.ksd-set .sd{width:176px;flex:none;border-right:1px solid var(--ln);padding:10px 8px;background:var(--g2);overflow:auto}\n.ksd-set .sd button{display:flex;align-items:center;gap:9px;width:100%;padding:7px 10px;border-radius:8px;font-weight:600;font-size:13px;text-align:left}\n.ksd-set .sd button.on{background:var(--acc);color:#fff}\n.ksd-set .mn{flex:1;min-width:0;overflow:auto;padding:20px 22px 30px}\n.ksd-set h2{font-size:20px;margin:0 0 4px;font-weight:700}\n.ksd-set .sub{opacity:.6;margin:0 0 16px;font-size:12.5px}\n.ksd-set .card{background:var(--g2);border:1px solid var(--ln);border-radius:12px;padding:14px;margin-bottom:14px}\n.ksd-set .rw{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0}\n.ksd-set .btn{padding:7px 14px;border-radius:8px;background:var(--acc);color:#fff;font-weight:600;font-size:12.5px}\n.ksd-set .btn.g{background:var(--g2);color:var(--tx);border:1px solid var(--ln)}\n.ksd-set .sw{width:40px;height:23px;border-radius:12px;background:rgba(128,128,128,.4);position:relative;transition:background .2s;flex:none}\n.ksd-set .sw::after{content:\"\";position:absolute;left:2px;top:2px;width:19px;height:19px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.4)}\n.ksd-set .sw.on{background:var(--acc)}.ksd-set .sw.on::after{transform:translateX(17px)}\n.ksd-set .wg{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}\n.ksd-set .wt{height:70px;border-radius:10px;position:relative;box-shadow:inset 0 0 0 1px var(--ln);background-size:cover;background-position:center}\n.ksd-set .wt.on{box-shadow:0 0 0 3px var(--acc)}\n.ksd-set .wt small{position:absolute;left:6px;bottom:4px;font-size:10.5px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8)}\n.ksd-set .ls .li{display:flex;align-items:center;gap:10px;padding:6px 4px;border-radius:8px}\n.ksd-set .ls .li:hover{background:var(--g2)}\n.ksd-set .ls .ti{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:15px;color:#fff;flex:none}\n.ksd-set .ls .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.ksd-set .ls .mini{padding:3px 8px;border-radius:6px;background:var(--g2);font-size:12px;border:1px solid var(--ln)}\n.ksd-set kbd{font:600 11.5px ui-monospace,monospace;background:var(--g2);border:1px solid var(--ln);border-radius:5px;padding:1px 6px}\n.ksd-set .sc{display:flex;justify-content:space-between;padding:5px 0;font-size:12.5px}\n.ksd-set input[type=range]{accent-color:var(--acc);width:160px}\n@media (max-width:900px){.ksd-set .sd{width:140px}}\n@media (prefers-reduced-motion:reduce){.ksd-win,.ksd-win *,#ksdDockWrap,.ksd-ov,.ksd-menu{animation:none!important;transition:none!important}}\n\n/* close-confirmation dialog + launchpad drag ghost */\n.ksd-dlg{position:absolute;inset:0;z-index:400;display:grid;place-items:center;background:rgba(0,0,0,.35);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:ksdPop .15s ease-out}\n.ksd-dlg .bx{width:min(400px,90vw);border-radius:16px;background:var(--g);border:1px solid var(--ln);box-shadow:0 30px 90px rgba(0,0,0,.5);padding:20px 22px 16px;-webkit-backdrop-filter:blur(30px) saturate(1.7);backdrop-filter:blur(30px) saturate(1.7)}\n.ksd-dlg h3{margin:0 0 6px;font-size:16px}\n.ksd-dlg p{margin:0 0 16px;opacity:.78;font-size:13px;line-height:1.5}\n.ksd-dlg .bt{display:flex;gap:8px;justify-content:flex-end}\n.ksd-dlg .bt button{padding:8px 16px;border-radius:9px;font-weight:600;background:var(--g2);border:1px solid var(--ln)}\n.ksd-dlg .bt button.d{background:#ef4444;color:#fff;border-color:#ef4444}\n.ksd-ghost{position:fixed;z-index:500;width:68px;height:68px;border-radius:23%;display:grid;place-items:center;color:#fff;pointer-events:none;box-shadow:0 14px 34px rgba(0,0,0,.45);transform:translate(-50%,-50%) scale(1.08);opacity:.95}\n.ksd-ghost span{font-size:34px;line-height:1}\n.ksd-lp.drag{opacity:.12!important;pointer-events:none}\n.ksd-lp .ap{touch-action:pan-y}\n.ksd-dk .ti svg{width:60%;height:60%}\n.ksd-lp .cnt{opacity:.6;font-size:12px;margin-top:8px}\n"; document.head.appendChild(s); })();
/* === AURORA DESKTOP: desktop shell ===
   Menu bar, dock, windows (each window is a small copy of Alio in embed mode), desktop icons, Spotlight, Launchpad,
   Mission Control, Settings. Only runs when the Aurora Desktop theme is chosen on a wide screen. */
(function(){
'use strict';
var D=document, H=D.documentElement, ORIGIN=location.origin;
function $(s,r){ return (r||D).querySelector(s); }
function $$(s,r){ return [].slice.call((r||D).querySelectorAll(s)); }
function el(tag,cls,html){ var e=D.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

/* =====================================================================
   INSIDE A WINDOW (embed mode): small helper that talks to the desktop
   ===================================================================== */
if(window.__KS_EMBED) return; /* windows use the small helper inside index.html */

/* =====================================================================
   THE DESKTOP
   ===================================================================== */
var KEY='ks_aurora_v1', GEOKEY='ks_aurora_geo', MAXWIN=4, BAR=30;
var DEFDOCK=['community','inbox','notes','games','health','science','pdftools','apps','settings'];
var S=lsGet(KEY,{}); if(!S||typeof S!=='object') S={};
S.dock=Array.isArray(S.dock)?S.dock.filter(function(x){ return typeof x==='string'; }):DEFDOCK.slice();
S.desk=Array.isArray(S.desk)?S.desk.filter(function(x){ return x && typeof x.id==='string'; }):[];
S.size=clamp(+S.size||54,40,72); S.mag=S.mag!==false; S.autohide=!!S.autohide; S.solid=!!S.solid; S.wall=S.wall||'wp0';
function save(){ lsSet(KEY,S); }

var on=false, root=null, winsEl=null, wallEl=null, iconsEl=null, dockWrap=null, dockEl=null, barEl=null, snapEl=null, toastEl=null, spotEl=null, lpEl=null, mcEl=null;
var W={}, order=[], zTop=10, EXTRA={}, menuEl=null, apps=null, selDesk=null, hudT=null;

/* ---------- apps ---------- */
var PAL=[['#5b8def','#3a5bd9'],['#a06bff','#6a3fd4'],['#ff7a7a','#e0405a'],['#35c3a0','#1a8f86'],['#ffb44a','#f07c2a'],['#ff6fae','#d93d86'],['#4cc9f0','#3a86d8'],['#8bd450','#3fa34d'],['#9aa3b5','#5d6578']];
var SPECIAL={community:['#34d399','#0f9d6e'],inbox:['#4ade80','#16a34a'],notes:['#fde047','#f59e0b'],games:['#a78bfa','#6d28d9'],health:['#fb7185','#e11d48'],science:['#2dd4bf','#0e7490'],pdftools:['#f87171','#b91c1c'],apps:['#60a5fa','#2563eb'],settings:['#a1a1aa','#52525b'],admin:['#fbbf24','#b45309'],calchub:['#fb923c','#c2410c'],catalog:['#c084fc','#7e22ce'],launchpad:['#f4f4f5','#a1a1aa'],auth:['#94a3b8','#475569']};
function pal(id){ if(SPECIAL[id]) return SPECIAL[id]; var h=0; for(var i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PAL[h%PAL.length]; }
function tileBg(id){ var p=pal(id); return 'linear-gradient(150deg,'+p[0]+','+p[1]+')'; }
function isAdmin(){ try{ return !!ksIsAdminNow(); }catch(e){ return false; } }
function buildApps(){
  var A={}, list=[];
  function add(a){ if(!a||!a.id||A[a.id]) return; A[a.id]=a; list.push(a); }
  add({id:'community',name:'Community',icon:'💬',page:'community',grp:'Social'});
  add({id:'inbox',name:'Messages',icon:'✉️',page:'inbox',grp:'Social'});
  add({id:'notes',name:'Notes & To-do',icon:'📝',page:'notes',grp:'Productivity'});
  add({id:'catalog',name:'Catalog',icon:'📚',page:'catalog',grp:'Productivity'});
  add({id:'pdftools',name:'PDF Tools',icon:'📄',page:'pdftools',grp:'Productivity'});
  add({id:'science',name:'Science Solver',icon:'🔬',page:'science',grp:'Productivity'});
  add({id:'apps',name:'Tools',icon:'🧰',page:'apps',grp:'Productivity'});
  add({id:'games',name:'Games',icon:'🎮',page:'games',grp:'Games'});
  add({id:'health',name:'Health',icon:'❤️',page:'health',grp:'Health'});
  add({id:'settings',name:'Settings',icon:'⚙️',native:'settings',grp:'System'});
  if(isAdmin()) add({id:'admin',name:'Admin',icon:'🛡️',page:'admin',grp:'System'});
  function fromList(L,grp,filter){
    try{ (L||[]).forEach(function(x){ if(x && (!filter||filter(x))) add({id:x.id,name:x.name,icon:x.icon||'🧩',page:x.id,grp:grp,desc:x.desc||''}); }); }catch(e){}
  }
  fromList(typeof APPS!=='undefined'?APPS:null,'Tools'); fromList(typeof GAMES_LIST!=='undefined'?GAMES_LIST:null,'Games');
  fromList(typeof HEALTH_TOOLS!=='undefined'?HEALTH_TOOLS:null,'Health'); fromList(typeof FUN_TOOLS!=='undefined'?FUN_TOOLS:null,'Fun',function(x){ return x.live; });
  return {map:A,list:list};
}
function getApps(){ if(!apps) apps=buildApps(); return apps; }
function appBy(id){ return getApps().map[id]||EXTRA[id]||null; }
function appForPage(p){
  var L=getApps().list; for(var i=0;i<L.length;i++){ if(L[i].page===p) return L[i]; }
  var id='page:'+p; if(!EXTRA[id]){ var nm={help:'Help Centre',auth:'Account',leaderboard:'Leaderboard'}[p]||('Alio'); EXTRA[id]={id:id,name:nm,icon:'🧩',page:p,grp:'Other'}; }
  return EXTRA[id];
}
function blocked(a){ try{ if(!a||a.native) return false; if(isAdmin()) return false; return !!isPageBlocked(a.page); }catch(e){ return false; } }
var GRID='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="2" fill="#3b82f6"/><rect x="13.5" y="3.5" width="7" height="7" rx="2" fill="#a855f7"/><rect x="3.5" y="13.5" width="7" height="7" rx="2" fill="#10b981"/><rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="#f59e0b"/></svg>';
function tileHTML(a){ return a.lp?GRID:'<span>'+(a.icon||'🧩')+'</span>'; }

/* ---------- toast + menus ---------- */
var toastT=null;
function toast(msg){
  if(!toastEl) return; toastEl.textContent=msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(function(){ toastEl.classList.remove('on'); },2600);
}
function closeMenu(){ if(menuEl){ menuEl.remove(); menuEl=null; } $$('#ksdBar .mb.open').forEach(function(b){ b.classList.remove('open'); }); $$('.ksd-flyout').forEach(function(f){ f.remove(); }); }
function placeMenu(m,x,y,right){
  var vw=innerWidth, vh=innerHeight, r=m.getBoundingClientRect();
  var left=right?x-r.width:x; left=clamp(left,6,vw-r.width-6); var top=y; if(top+r.height>vh-6) top=Math.max(6,vh-r.height-6);
  m.style.left=left+'px'; m.style.top=top+'px';
}
function showMenu(items,x,y,opt){
  closeMenu(); opt=opt||{};
  var m=el('div','ksd-menu ksd-blur'); m.setAttribute('role','menu');
  items.forEach(function(it){
    if(it==='-'){ m.appendChild(el('div','sep')); return; }
    if(it.hd){ m.appendChild(el('div','hd',esc(it.hd))); return; }
    var d=el('div','it'+(it.off?' off':''),(it.ck!==undefined?'<span class="ck">'+(it.ck?'✓':'')+'</span>':'')+'<span>'+esc(it.t)+'</span>'+(it.k?'<span class="k">'+esc(it.k)+'</span>':''));
    d.setAttribute('role','menuitem');
    d.addEventListener('click',function(ev){ ev.stopPropagation(); if(it.off) return; closeMenu(); setTimeout(function(){ try{ it.fn&&it.fn(); }catch(e){ console.error(e); } },0); });
    m.appendChild(d);
  });
  root.appendChild(m); placeMenu(m,x,y,opt.right); menuEl=m; return m;
}
function barMenu(btn,items,right){
  if(btn.classList.contains('open')){ closeMenu(); return; }
  var r=btn.getBoundingClientRect(); closeMenu(); btn.classList.add('open');
  var m=showMenu(items,right?r.right:r.left,BAR+2,{right:right}); btn.classList.add('open'); return m;
}
function longPress(node,fn){
  var t=null,sx=0,sy=0;
  node.addEventListener('pointerdown',function(e){ if(e.pointerType==='mouse') return; sx=e.clientX; sy=e.clientY; clearTimeout(t); t=setTimeout(function(){ fn(sx,sy); },520); });
  ['pointerup','pointercancel'].forEach(function(n){ node.addEventListener(n,function(){ clearTimeout(t); }); });
  node.addEventListener('pointermove',function(e){ if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)>10) clearTimeout(t); });
}

/* ---------- geometry ---------- */
function area(){ return {w:innerWidth,h:innerHeight-BAR}; }
function dockReserve(){ return S.autohide?0:(S.size+36); }
function workArea(){ var a=area(); return {x:0,y:0,w:a.w,h:a.h-dockReserve()}; }
function zoneRect(z){
  var a=workArea(), hw=Math.round(a.w/2), hh=Math.round(a.h/2);
  switch(z){
    case 'l': return {x:0,y:0,w:hw,h:a.h};
    case 'r': return {x:hw,y:0,w:a.w-hw,h:a.h};
    case 't': return {x:0,y:0,w:a.w,h:hh};
    case 'b': return {x:0,y:hh,w:a.w,h:a.h-hh};
    case 'tl': return {x:0,y:0,w:hw,h:hh};
    case 'tr': return {x:hw,y:0,w:a.w-hw,h:hh};
    case 'bl': return {x:0,y:hh,w:hw,h:a.h-hh};
    case 'br': return {x:hw,y:hh,w:a.w-hw,h:a.h-hh};
    default: return {x:0,y:0,w:a.w,h:a.h};
  }
}
function curRect(w){ var s=w.el.style; return {x:parseFloat(s.left)||0,y:parseFloat(s.top)||0,w:parseFloat(s.width)||600,h:parseFloat(s.height)||400}; }
function setRect(w,r,animate){
  var s=w.el.style;
  if(animate){ w.el.classList.add('anim'); clearTimeout(w.animT); w.animT=setTimeout(function(){ w.el.classList.remove('anim'); },300); }
  s.left=Math.round(r.x)+'px'; s.top=Math.round(r.y)+'px'; s.width=Math.round(r.w)+'px'; s.height=Math.round(r.h)+'px';
}
function geo(){ return lsGet(GEOKEY,{}); }
function saveGeo(w){ if(w.state!=='normal') return; var g=geo(), r=curRect(w); g[w.id]={x:r.x,y:r.y,w:r.w,h:r.h}; var ks=Object.keys(g); if(ks.length>60) delete g[ks[0]]; lsSet(GEOKEY,g); }
function defaultRect(a,n){
  var wa=workArea(), g=geo()[a.id], w0,h0,x0,y0;
  if(g && g.w && g.h){ w0=clamp(g.w,340,wa.w); h0=clamp(g.h,240,wa.h); x0=g.x; y0=g.y; }
  else{ w0=Math.min(wa.w-48,a.w||980); h0=Math.min(wa.h-36,a.h||660); var off=(n%5)*30; x0=Math.round((wa.w-w0)/2)+off-30; y0=Math.round((wa.h-h0)/3)+off-20; }
  x0=clamp(x0,-(w0-120),wa.w-120); y0=clamp(y0,0,Math.max(0,wa.h-60));
  return {x:x0,y:y0,w:w0,h:h0};
}

/* ---------- windows ---------- */
function wcount(){ return Object.keys(W).length; }
function topWin(){ for(var i=order.length-1;i>=0;i--){ var w=W[order[i]]; if(w && w.state!=='min') return w; } return null; }
function openApp(id,opt){
  var a=typeof id==='string'?appBy(id):id; if(!a) return;
  if(blocked(a)){ toast('The Alio team has paused this for now.'); return; }
  closeOverlays();
  var w=W[a.id];
  if(w){ if(w.state==='min') restoreWin(w); focusWin(w); bounce(a.id); return w; }
  if(wcount()>=MAXWIN){
    toast('Close a window to open another — 4 windows can be open at once.');
    var wi=winsEl; wi.classList.remove('ksd-bounceAll'); void wi.offsetWidth; wi.classList.add('ksd-bounceAll');
    return null;
  }
  return createWin(a);
}
function createWin(a){
  var w={id:a.id,app:a,state:'normal',prev:null,zone:null,ready:false};
  var e=el('div','ksd-win opening'); e.setAttribute('role','dialog'); e.setAttribute('aria-label',a.name);
  var p=pal(a.id);
  e.innerHTML='<div class="ksd-in"><div class="ksd-head"><span class="ic" style="background:'+tileBg(a.id)+'">'+(a.icon||'🧩')+'</span><span class="tt">'+esc(a.name)+'</span>'
    +'<div class="ksd-ctl"><button class="bm" aria-label="Minimize" title="Minimize"><svg viewBox="0 0 12 12"><path d="M2.5 6h7"/></svg></button><button class="bx" aria-label="Maximize" title="Maximize"><svg viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" rx="1.4"/></svg></button><button class="bc" aria-label="Close" title="Close"><svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg></button></div></div>'
    +'<div class="ksd-body"><div class="ksd-spin"></div><div class="ksd-shield"></div></div></div>'
    +['n','s','e','w','ne','nw','se','sw'].map(function(d){ return '<i class="ksd-rz" data-d="'+d+'"></i>'; }).join('');
  w.el=e; setRect(w,defaultRect(a,wcount()),false);
  winsEl.appendChild(e); W[a.id]=w; order.push(a.id);
  var body=$('.ksd-body',e);
  if(a.native==='settings'){ var n=el('div','nat'); body.appendChild(n); w.nat=n; var sp=$('.ksd-spin',body); if(sp) sp.remove(); buildSettings(n,a.pane||'appearance'); w.ready=true; }
  else{
    var f=el('iframe'); f.title=a.name; f.setAttribute('allow','clipboard-read; clipboard-write; fullscreen');
    f.src=location.origin+location.pathname+'?embed=1&page='+encodeURIComponent(a.page);
    w.iframe=f; body.insertBefore(f,body.firstChild);
    var done=function(){ if(w.ready) return; w.ready=true; f.classList.add('ld'); var sp=$('.ksd-spin',body); if(sp) sp.remove(); };
    w.done=done; f.addEventListener('load',function(){ setTimeout(done,3500); });
    setTimeout(done,9000);
  }
  wire(w);
  setTimeout(function(){ e.classList.remove('opening'); },320);
  focusWin(w); bounce(a.id); renderDock();
  return w;
}
function wire(w){
  var e=w.el, head=$('.ksd-head',e);
  head.addEventListener('pointerdown',function(ev){ startDrag(w,ev); });
  head.addEventListener('dblclick',function(ev){ if(ev.target.closest('.ksd-ctl')) return; toggleMax(w); });
  $('.bm',e).addEventListener('click',function(ev){ ev.stopPropagation(); minimizeWin(w); });
  var bx=$('.bx',e); bx.addEventListener('click',function(ev){ ev.stopPropagation(); closeMenu(); toggleMax(w); });
  $('.bc',e).addEventListener('click',function(ev){ ev.stopPropagation(); askClose([w]); });
  var ft=null; bx.addEventListener('mouseenter',function(){ clearTimeout(ft); ft=setTimeout(function(){ snapFlyout(w,bx); },420); });
  bx.addEventListener('mouseleave',function(){ clearTimeout(ft); });
  $$('.ksd-rz',e).forEach(function(h){ h.addEventListener('pointerdown',function(ev){ startResize(w,h.dataset.d,ev); }); });
  e.addEventListener('pointerdown',function(){ if(topWin()!==w || !e.classList.contains('focus')) focusWin(w); },true);
  var sh=$('.ksd-shield',e); if(sh) sh.addEventListener('pointerdown',function(){ focusWin(w); });
}
function focusWin(w){
  if(!w) return;
  Object.keys(W).forEach(function(k){ W[k].el.classList.toggle('focus',W[k]===w); });
  w.el.style.zIndex=++zTop; var i=order.indexOf(w.id); if(i>=0) order.splice(i,1); order.push(w.id);
  updateBar(); renderDock(true);
}
function blurAll(){ Object.keys(W).forEach(function(k){ W[k].el.classList.remove('focus'); }); updateBar(); }
function nextFocus(){ var t=topWin(); if(t) focusWin(t); else { updateBar(); renderDock(true); } }
function closeWin(w){
  if(!w||!W[w.id]) return; saveGeo(w);
  var id=w.id; delete W[id]; var i=order.indexOf(id); if(i>=0) order.splice(i,1);
  w.el.classList.add('closing'); closeMenu();
  try{ if(w.iframe){ w.iframe.src='about:blank'; } }catch(e){} /* leaving the page stops that window's live listeners */
  setTimeout(function(){ try{ if(w.iframe){ w.iframe.remove(); } w.el.remove(); }catch(e){} },190);
  nextFocus(); renderDock(); refreshMC();
}
function dockCenter(id){
  var d=dockEl&&$('.ksd-dk[data-id="'+id.replace(/"/g,'')+'"]',dockEl);
  var r=d?d.getBoundingClientRect():{left:innerWidth/2-20,top:innerHeight-60,width:40,height:40};
  return {x:r.left+r.width/2,y:r.top+r.height/2};
}
function minimizeWin(w){
  if(!w||w.state==='min') return; var r=w.el.getBoundingClientRect(), c=dockCenter(w.id);
  w.el.style.setProperty('--mx',Math.round(c.x-(r.left+r.width/2))+'px'); w.el.style.setProperty('--my',Math.round(c.y-(r.top+r.height/2))+'px');
  w.pstate=w.state; w.state='min'; w.el.classList.add('min'); w.el.classList.remove('focus'); closeMenu();
  setTimeout(function(){ if(w.state==='min') w.el.classList.add('hid'); },340);
  nextFocus(); renderDock();
}
function restoreWin(w){
  if(w.state!=='min') return; w.state=w.pstate||'normal'; w.el.classList.remove('hid'); void w.el.offsetWidth;
  w.el.classList.remove('min'); w.el.classList.add('opening'); setTimeout(function(){ w.el.classList.remove('opening'); },300);
  focusWin(w); renderDock();
}
function toggleMax(w){
  if(!w||w.state==='min') return;
  if(w.state==='normal'){ w.prev=curRect(w); w.state='max'; w.zone='full'; w.el.classList.add('max'); setRect(w,zoneRect('full'),true); }
  else{ restoreNormal(w,true); }
  focusWin(w);
}
function restoreNormal(w,animate,rect){
  var r=rect||w.prev||defaultRect(w.app,0); w.state='normal'; w.zone=null; w.el.classList.remove('max','snp'); setRect(w,r,animate); w.prev=null; saveGeo(w);
}
function snapWin(w,z){
  if(!w||w.state==='min') return;
  if(z==='restore'){ if(w.state!=='normal') restoreNormal(w,true); return; }
  if(z==='full'){ if(w.state!=='max') toggleMax(w); return; }
  if(w.state==='normal') w.prev=curRect(w);
  w.state='snap'; w.zone=z; w.el.classList.remove('max'); w.el.classList.add('snp'); setRect(w,zoneRect(z),true); focusWin(w);
}
function layoutAll(){
  var a=workArea();
  Object.keys(W).forEach(function(k){
    var w=W[k]; if(w.state==='max') setRect(w,zoneRect('full'),false);
    else if(w.state==='snap') setRect(w,zoneRect(w.zone),false);
    else{ var r=curRect(w); r.w=Math.min(r.w,a.w); r.h=Math.min(r.h,a.h); r.x=clamp(r.x,-(r.w-120),a.w-120); r.y=clamp(r.y,0,Math.max(0,a.h-60)); setRect(w,r,false); }
  });
}
function tileAll(){
  var ws=order.map(function(i){ return W[i]; }).filter(function(w){ return w && w.state!=='min'; });
  var n=ws.length; if(!n){ return; }
  var Z={1:['full'],2:['l','r'],3:['l','tr','br'],4:['tl','tr','bl','br']}[Math.min(n,4)];
  ws.slice(-4).forEach(function(w,i){ snapWin(w,Z[i]); });
}
function snapFlyout(w,btn){
  if(w.state==='min') return; closeMenu();
  var r=btn.getBoundingClientRect(), f=el('div','ksd-flyout ksd-blur');
  var L=[['l',[0,0,50,100]],['t',[0,0,100,50]],['r',[50,0,50,100]],['tl',[0,0,50,50]],['full',[0,0,100,100]],['tr',[50,0,50,50]],['bl',[0,50,50,50]],['b',[0,50,100,50]],['br',[50,50,50,50]]];
  L.forEach(function(z){ var b=el('button'); b.setAttribute('aria-label','Snap '+z[0]); b.innerHTML='<i style="left:'+(z[1][0]+6)*0.88+'%;top:'+(z[1][1]+8)*0.84+'%;width:'+(z[1][2]*0.84)+'%;height:'+(z[1][3]*0.72)+'%"></i>';
    b.onclick=function(){ closeMenu(); snapWin(w,z[0]); }; f.appendChild(b); });
  root.appendChild(f); var fr=f.getBoundingClientRect(); f.style.left=clamp(r.right-fr.width,6,innerWidth-fr.width-6)+'px'; f.style.top=(r.bottom+4)+'px';
  menuEl=f;
  f.addEventListener('mouseleave',function(){ closeMenu(); });
}

/* drag */
function startDrag(w,ev){
  if(ev.button>0 || ev.target.closest('.ksd-ctl')) return;
  var head=ev.currentTarget; focusWin(w);
  var sx=ev.clientX, sy=ev.clientY, moved=false, r0=curRect(w), zone=null;
  try{ head.setPointerCapture(ev.pointerId); }catch(e){}
  function zoneAt(px,py){
    var a=area(), T=10, C=70, wa=a;
    var nl=px<=T, nr=px>=wa.w-T, nt=py<=T, nb=py>=wa.h-T;
    if(nt && nl) return 'tl'; if(nt && nr) return 'tr';
    if(nl && py>=wa.h-C) return 'bl'; if(nr && py>=wa.h-C) return 'br';
    if(nl) return 'l'; if(nr) return 'r'; if(nt) return 'full';
    return null;
  }
  function mv(e){
    var dx=e.clientX-sx, dy=e.clientY-sy;
    if(!moved){
      if(Math.abs(dx)+Math.abs(dy)<4) return; moved=true; winsEl.classList.add('drag'); closeMenu();
      if(w.state!=='normal'){ /* pulled off a maximized / snapped spot: back to its normal size, under the pointer */
        var pr=w.prev||defaultRect(w.app,0), ratio=clamp((sx-r0.x)/Math.max(1,r0.w),0,1);
        r0={x:Math.round(sx-ratio*pr.w),y:0,w:pr.w,h:pr.h}; sy=e.clientY-12; dy=0; dx=0;
        w.state='normal'; w.zone=null; w.el.classList.remove('max','snp'); setRect(w,r0,false); w.prev=null;
      }
    }
    var a=area(), nx=clamp(r0.x+dx,-(r0.w-100),a.w-100), ny=clamp(r0.y+dy,0,a.h-44);
    w.el.style.left=Math.round(nx)+'px'; w.el.style.top=Math.round(ny)+'px';
    zone=zoneAt(e.clientX,e.clientY-BAR);
    if(zone){ var zr=zoneRect(zone); if(zone==='full'){ zr={x:0,y:0,w:a.w,h:a.h}; } snapEl.style.cssText='left:'+zr.x+'px;top:'+zr.y+'px;width:'+zr.w+'px;height:'+zr.h+'px'; snapEl.classList.add('on'); }
    else snapEl.classList.remove('on');
  }
  function up(){
    head.removeEventListener('pointermove',mv); head.removeEventListener('pointerup',up); head.removeEventListener('pointercancel',up);
    winsEl.classList.remove('drag'); snapEl.classList.remove('on');
    if(moved){ if(zone){ w.prev=curRect(w); if(zone==='full'){ w.state='max'; w.zone='full'; w.el.classList.add('max'); setRect(w,zoneRect('full'),true); } else{ snapWin(w,zone); } } else saveGeo(w); }
  }
  head.addEventListener('pointermove',mv); head.addEventListener('pointerup',up); head.addEventListener('pointercancel',up);
}
function startResize(w,dir,ev){
  if(w.state!=='normal' || ev.button>0) return; ev.preventDefault(); ev.stopPropagation(); focusWin(w);
  var h=ev.currentTarget, sx=ev.clientX, sy=ev.clientY, r0=curRect(w), a=area(), MINW=340, MINH=240;
  try{ h.setPointerCapture(ev.pointerId); }catch(e){}
  winsEl.classList.add('drag');
  function mv(e){
    var dx=e.clientX-sx, dy=e.clientY-sy, x=r0.x, y=r0.y, ww=r0.w, hh=r0.h;
    if(dir.indexOf('e')>=0) ww=Math.max(MINW,r0.w+dx);
    if(dir.indexOf('s')>=0) hh=Math.max(MINH,r0.h+dy);
    if(dir.indexOf('w')>=0){ ww=Math.max(MINW,r0.w-dx); x=r0.x+(r0.w-ww); }
    if(dir.indexOf('n')>=0){ hh=Math.max(MINH,r0.h-dy); y=r0.y+(r0.h-hh); if(y<0){ hh+=y; y=0; } }
    setRect(w,{x:x,y:y,w:ww,h:hh},false);
  }
  function up(){ h.removeEventListener('pointermove',mv); h.removeEventListener('pointerup',up); h.removeEventListener('pointercancel',up); winsEl.classList.remove('drag'); saveGeo(w); }
  h.addEventListener('pointermove',mv); h.addEventListener('pointerup',up); h.addEventListener('pointercancel',up);
}

/* ---------- dock ---------- */
var dockBase=[], dockPtr=null, magRaf=0, dockHideT=null, justDragged=false;
function dockItems(){
  var items=[{id:'launchpad',name:'All apps',icon:'',lp:true}];
  S.dock.forEach(function(id){ var a=appBy(id); if(a) items.push(a); });
  var shown={}; items.forEach(function(i){ shown[i.id]=1; });
  var extra=order.filter(function(id){ return !shown[id] && W[id]; });
  return {items:items,extra:extra.map(function(id){ return W[id].app; })};
}
function unreadN(){ try{ var h=ksUnreadBadgeHTML(); var m=/>([^<]+)</.exec(h||''); var n=m?parseInt(m[1],10):0; return isNaN(n)?0:n; }catch(e){ return 0; } }
function renderDock(light){
  if(!dockEl) return;
  var info=dockItems(), un=unreadN();
  if(light){ $$('.ksd-dk',dockEl).forEach(function(d){ var id=d.dataset.id; d.classList.toggle('run',!!W[id]); }); return; }
  dockEl.innerHTML='';
  function mk(a,pinned){
    var b=el('button','ksd-dk'+(W[a.id]?' run':'')+(blocked(a)?' dim':'')); b.dataset.id=a.id; b.setAttribute('aria-label',a.name); b.style.setProperty('--w',S.size+'px'); b.style.width=b.style.height=S.size+'px';
    b.innerHTML='<div class="ti" style="background:'+(a.lp?'linear-gradient(150deg,#ffffff,#d4d4d8)':tileBg(a.id))+'">'+tileHTML(a)+'</div><i class="dot"></i><span class="lb">'+esc(a.name)+'</span>'
      +((a.id==='inbox'&&un)?'<span class="bd">'+(un>99?'99+':un)+'</span>':'');
    b.addEventListener('click',function(){ if(justDragged){ justDragged=false; return; } if(a.lp){ openLaunchpad(); return; } openApp(a); });
    b.addEventListener('contextmenu',function(e){ e.preventDefault(); dockMenu(a,e.clientX,e.clientY); });
    longPress(b,function(x,y){ dockMenu(a,x,y); });
    if(pinned && !a.lp) dockDragInit(b,a);
    dockEl.appendChild(b); return b;
  }
  info.items.forEach(function(a){ mk(a,true); });
  if(info.extra.length){ dockEl.appendChild(el('i','ksd-dsep')); info.extra.forEach(function(a){ mk(a,false); }); }
  measureDock();
}
function measureDock(){
  dockBase=$$('.ksd-dk',dockEl).map(function(d){ d.style.transform=''; var r=d.getBoundingClientRect(); return {el:d,cx:r.left+r.width/2,w:r.width}; });
}
function dockMag(){
  magRaf=0; if(!dockBase.length) return;
  var px=dockPtr, S0=S.size, maxS=(S.mag&&px!=null)?1.7:1, sig=S0*1.05, ex=[], tot=0;
  dockBase.forEach(function(b){ var s=1; if(px!=null&&maxS>1){ var d=Math.abs(px-b.cx); s=1+(maxS-1)*Math.exp(-(d*d)/(2*sig*sig)); } ex.push((s-1)*b.w); b.s=s; tot+=(s-1)*b.w; });
  var acc=0;
  dockBase.forEach(function(b,i){ var off=acc+ex[i]/2-tot/2; acc+=ex[i]; b.el.style.transform=(b.s>1.002)?'translateX('+off.toFixed(1)+'px) scale('+b.s.toFixed(3)+')':''; b.el.style.setProperty('--s',b.s.toFixed(2)); b.el.style.zIndex=b.s>1.2?2:''; });
}
function dockMenu(a,x,y){
  if(a.lp){ showMenu([{t:'Open all apps',fn:openLaunchpad}],x,y); return; }
  var open=W[a.id], pinned=S.dock.indexOf(a.id)>=0, onDesk=S.desk.some(function(d){ return d.id===a.id; });
  var it=[{hd:a.name}];
  it.push(open?{t:'Show Window',fn:function(){ openApp(a); }}:{t:'Open',fn:function(){ openApp(a); }});
  it.push('-');
  it.push(pinned?{t:'Remove from Dock',fn:function(){ dockRemove(a.id); }}:{t:'Keep in Dock',fn:function(){ dockAdd(a.id); }});
  it.push(onDesk?{t:'Remove from Desktop',fn:function(){ deskRemove(a.id); }}:{t:'Add to Desktop',fn:function(){ deskAdd(a.id); }});
  if(open){ it.push('-'); it.push({t:'Close Window',fn:function(){ askClose([W[a.id]]); }}); }
  showMenu(it,x,Math.max(10,y-10-it.length*30));
}
function dockAdd(id){ if(S.dock.indexOf(id)<0){ S.dock.push(id); save(); renderDock(); } }
function dockRemove(id){ S.dock=S.dock.filter(function(x){ return x!==id; }); save(); renderDock(); }
function dockDragInit(b,a){
  b.addEventListener('pointerdown',function(ev){
    if(ev.button>0 || ev.pointerType==='touch') return;
    var sx=ev.clientX, sy=ev.clientY, moving=false, idx=S.dock.indexOf(a.id); if(idx<0) return;
    var pinnedBase=dockBase.filter(function(x){ return S.dock.indexOf(x.el.dataset.id)>=0; });
    try{ b.setPointerCapture(ev.pointerId); }catch(e){}
    function mv(e){
      var dx=e.clientX-sx, dy=e.clientY-sy;
      if(!moving){ if(Math.abs(dx)+Math.abs(dy)<8) return; moving=true; b.classList.add('drg'); dockPtr=null; }
      b.style.transform='translate('+dx+'px,'+Math.min(dy,12)+'px)';
    }
    function up(e){
      b.removeEventListener('pointermove',mv); b.removeEventListener('pointerup',up); b.removeEventListener('pointercancel',up);
      if(!moving) return; justDragged=true; setTimeout(function(){ justDragged=false; },60);
      var dr=dockEl.getBoundingClientRect();
      if(e.clientY<dr.top-60){ dockRemove(a.id); toast(a.name+' removed from the Dock'); return; }
      var to=0, best=1e9; pinnedBase.forEach(function(x,i){ var d=Math.abs(e.clientX-x.cx); if(d<best){ best=d; to=i; } });
      var ids=S.dock.slice(); ids.splice(ids.indexOf(a.id),1); ids.splice(to,0,a.id); S.dock=ids; save(); renderDock();
    }
    b.addEventListener('pointermove',mv); b.addEventListener('pointerup',up); b.addEventListener('pointercancel',up);
  });
}
function dockShow(v){ if(!dockWrap) return; dockWrap.classList.toggle('hide',!v); }
function dockSetup(){
  dockEl.addEventListener('pointermove',function(e){ if(e.pointerType!=='mouse') return; dockPtr=e.clientX; if(!magRaf) magRaf=requestAnimationFrame(dockMag); });
  dockEl.addEventListener('pointerleave',function(){ dockPtr=null; if(!magRaf) magRaf=requestAnimationFrame(dockMag); if(S.autohide){ clearTimeout(dockHideT); dockHideT=setTimeout(function(){ dockShow(false); },650); } });
  dockEl.addEventListener('pointerenter',function(){ clearTimeout(dockHideT); });
  var hot=$('#ksdHot',root); hot.addEventListener('pointerenter',function(){ if(S.autohide){ clearTimeout(dockHideT); dockShow(true); } });
  applyDockPrefs();
}
function applyDockPrefs(){ dockShow(!S.autohide); root.classList.toggle('solid',!!S.solid); renderDock(); layoutAll(); }
function bounce(id){ var d=dockEl&&$('.ksd-dk[data-id="'+id.replace(/"/g,'')+'"]',dockEl); if(d){ d.classList.remove('bounce'); void d.offsetWidth; d.classList.add('bounce'); setTimeout(function(){ d.classList.remove('bounce'); },1300); } }

/* ---------- desktop icons ---------- */
var CW=100, CH=104, PADX=14, PADY=14;
function gridRows(){ return Math.max(1,Math.floor((area().h-dockReserve()-PADY)/CH)); }
function cellFree(c,r,except){ return !S.desk.some(function(d){ return d.id!==except && d.c===c && d.r===r; }); }
function findFree(c,r,except){
  var rows=gridRows(), cols=Math.max(1,Math.floor((area().w-PADX)/CW)); c=clamp(c,0,cols-1); r=clamp(r,0,rows-1);
  if(cellFree(c,r,except)) return {c:c,r:r};
  for(var k=0;k<rows*cols;k++){ var cc=Math.floor(k/rows), rr=k%rows; if(cellFree(cc,rr,except)) return {c:cc,r:rr}; }
  return {c:c,r:r};
}
function deskAdd(id,c,r){
  if(S.desk.some(function(d){ return d.id===id; })){ toast('Already on the Desktop'); return; }
  var p=findFree(c||0,r||0); S.desk.push({id:id,c:p.c,r:p.r}); save(); renderIcons();
}
function deskRemove(id){ S.desk=S.desk.filter(function(d){ return d.id!==id; }); save(); renderIcons(); }
function deskSort(){ var rows=gridRows(); S.desk.sort(function(a,b){ var A=appBy(a.id),B=appBy(b.id); return String(A&&A.name).localeCompare(String(B&&B.name)); }); S.desk.forEach(function(d,i){ d.c=Math.floor(i/rows); d.r=i%rows; }); save(); renderIcons(); }
function renderIcons(){
  if(!iconsEl) return; iconsEl.innerHTML='';
  S.desk.forEach(function(d){
    var a=appBy(d.id); if(!a) return;
    var n=el('button','ksd-di'+(selDesk===d.id?' sel':'')+(blocked(a)?' dim':'')); n.dataset.id=d.id; n.setAttribute('aria-label',a.name);
    n.style.left=(PADX+d.c*CW)+'px'; n.style.top=(PADY+d.r*CH)+'px';
    n.innerHTML='<div class="ti" style="background:'+tileBg(a.id)+'">'+tileHTML(a)+'</div><span class="nm">'+esc(a.name)+'</span>';
    n.addEventListener('dblclick',function(){ openApp(a); });
    n.addEventListener('click',function(e){ e.stopPropagation(); selDesk=d.id; $$('.ksd-di',iconsEl).forEach(function(x){ x.classList.toggle('sel',x===n); }); if(e.detail===0) openApp(a); });
    n.addEventListener('keydown',function(e){ if(e.key==='Enter'){ openApp(a); } if(e.key==='Delete'||e.key==='Backspace'){ deskRemove(d.id); } });
    n.addEventListener('contextmenu',function(e){ e.preventDefault(); e.stopPropagation(); selDesk=d.id; showMenu([{t:'Open',fn:function(){ openApp(a); }},{t:'Keep in Dock',off:S.dock.indexOf(a.id)>=0,fn:function(){ dockAdd(a.id); }},'-',{t:'Remove from Desktop',fn:function(){ deskRemove(d.id); }}],e.clientX,e.clientY); });
    longPress(n,function(x,y){ showMenu([{t:'Open',fn:function(){ openApp(a); }},{t:'Remove from Desktop',fn:function(){ deskRemove(d.id); }}],x,y); });
    n.addEventListener('pointerdown',function(ev){
      if(ev.button>0) return; var sx=ev.clientX, sy=ev.clientY, ox=PADX+d.c*CW, oy=PADY+d.r*CH, mvd=false;
      if(ev.pointerType==='touch'){ /* tablets: a tap opens it; dragging still moves it */ }
      try{ n.setPointerCapture(ev.pointerId); }catch(e){}
      function mv(e){ var dx=e.clientX-sx, dy=e.clientY-sy; if(!mvd){ if(Math.abs(dx)+Math.abs(dy)<5) return; mvd=true; n.classList.add('drg'); }
        n.style.left=(ox+dx)+'px'; n.style.top=(oy+dy)+'px'; }
      function up(e){ n.removeEventListener('pointermove',mv); n.removeEventListener('pointerup',up); n.removeEventListener('pointercancel',up);
        if(mvd){ var c=Math.round((ox+(e.clientX-sx)-PADX)/CW), r=Math.round((oy+(e.clientY-sy)-PADY)/CH); var p=findFree(c,r,d.id); d.c=p.c; d.r=p.r; save(); renderIcons(); }
        else if(ev.pointerType==='touch'){ openApp(a); } }
      n.addEventListener('pointermove',mv); n.addEventListener('pointerup',up); n.addEventListener('pointercancel',up);
    });
    iconsEl.appendChild(n);
  });
}

/* ---------- wallpaper ---------- */
var WALLS=[['wp0','Dusk'],['wp1','Glacier'],['wp2','Graphite'],['wp3','Ember'],['wp4','Aurora'],['wp5','Ocean'],['wp6','Sand'],['wp7','Orchid'],['wp8','Meadow'],['wp9','Blossom'],['wp10','Midnight'],['wp11','Mint']];
var wallURL=null;
function idb(){
  return new Promise(function(res,rej){ try{ var q=indexedDB.open('ks_aurora',1); q.onupgradeneeded=function(){ q.result.createObjectStore('kv'); }; q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ rej(q.error); }; }catch(e){ rej(e); } });
}
function idbGet(k){ return idb().then(function(db){ return new Promise(function(res,rej){ var r=db.transaction('kv').objectStore('kv').get(k); r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }); }); }
function idbSet(k,v){ return idb().then(function(db){ return new Promise(function(res,rej){ var tx=db.transaction('kv','readwrite'); tx.objectStore('kv').put(v,k); tx.oncomplete=function(){ res(); }; tx.onerror=function(){ rej(tx.error); }; }); }); }
function cfbImage(){ try{ var st=window.CFB&&CFB.getState&&CFB.getState(); return (st&&st.background&&st.background.image)||null; }catch(e){ return null; } }
function applyWall(){
  if(!wallEl) return; wallEl.className='ksd-wall'; wallEl.style.backgroundImage='';
  var id=S.wall;
  function stock(k){ wallEl.className='ksd-wall '+(WALLS.some(function(w){ return w[0]===k; })?k:'wp0'); }
  if(id==='photo'){ idbGet('wall').then(function(b){ if(!b){ stock('wp0'); return; } if(wallURL) URL.revokeObjectURL(wallURL); wallURL=URL.createObjectURL(b); wallEl.className='ksd-wall photo'; wallEl.style.backgroundImage='url("'+wallURL+'")'; }).catch(function(){ stock('wp0'); }); }
  else if(id==='cfb'){ var im=cfbImage(); if(im){ wallEl.className='ksd-wall photo'; wallEl.style.backgroundImage='url("'+im+'")'; } else stock('wp0'); }
  else stock(id);
}
function setWall(id){ S.wall=id; save(); applyWall(); }
function uploadWall(file,done){
  if(!file||!/^image\//.test(file.type)){ toast('Please choose an image file'); return; }
  var r=new FileReader();
  r.onerror=function(){ toast('Could not read that image'); };
  r.onload=function(){
    var im=new Image(); im.onerror=function(){ toast('That file is not a valid image'); };
    im.onload=function(){
      var m=Math.min(1,2560/Math.max(im.naturalWidth,im.naturalHeight)), cv=D.createElement('canvas');
      cv.width=Math.max(1,Math.round(im.naturalWidth*m)); cv.height=Math.max(1,Math.round(im.naturalHeight*m));
      cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
      cv.toBlob(function(b){ if(!b){ toast('Could not use that image'); return; } idbSet('wall',b).then(function(){ setWall('photo'); done&&done(); toast('Wallpaper changed'); }).catch(function(){ toast('Could not save the wallpaper on this device'); }); },'image/jpeg',0.86);
    };
    im.src=r.result;
  };
  r.readAsDataURL(file);
}
function pickWallFile(done){ var f=el('input'); f.type='file'; f.accept='image/*'; f.onchange=function(){ if(f.files[0]) uploadWall(f.files[0],done); }; f.click(); }

/* ---------- menu bar ---------- */
var ICO={ai:'<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  mc:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/></svg>',
  cc:'<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>',
  bell:'<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 004 0"/></svg>'};
function buildBar(){
  barEl.innerHTML='<div class="l"><button class="mb" id="ksdMLogo" aria-label="Alio menu"><span class="logo">A</span></button><span class="mb app" id="ksdMApp">Alio</span>'
    +'<button class="mb" id="ksdMWin">Window</button><button class="mb" id="ksdMHelp">Help</button></div>'
    +'<div class="r"><button class="mb" id="ksdMAi" title="Alio Assistant" aria-label="Alio Assistant">'+ICO.ai+'</button><button class="mb" id="ksdMSearch" title="Search (Ctrl+Space)" aria-label="Search">'+ICO.search+'</button>'
    +'<button class="mb" id="ksdMMc" title="Mission Control (F3)" aria-label="Mission Control">'+ICO.mc+'</button><button class="mb" id="ksdMCc" title="Control Center" aria-label="Control Center">'+ICO.cc+'</button>'
    +'<button class="mb" id="ksdMBell" title="Messages" aria-label="Messages">'+ICO.bell+'<span class="bd" style="display:none"></span></button>'
    +'<button class="mb" id="ksdMUser" title="Account" aria-label="Account"><span class="av"></span></button><span class="mb clock" id="ksdClock"></span></div>';
  var g=function(i){ return $('#'+i,barEl); };
  g('ksdMLogo').addEventListener('pointerdown',function(e){ e.preventDefault(); barMenu(this,[
    {t:'About Alio',fn:function(){ openSettings2('about'); }},'-',{t:'Settings…',fn:function(){ openSettings2('appearance'); }},{t:'Alio account & settings…',fn:function(){ try{ openSettings(); }catch(e){} }},'-',
    {t:'All apps',fn:openLaunchpad},{t:'Mission Control',k:'F3',fn:function(){ openMissionControl(); }},{t:'Search…',k:'Ctrl+Space',fn:openSpotlight},'-',
    {t:'Exit Desktop mode',fn:exitDesktop}]); });
  g('ksdMWin').addEventListener('pointerdown',function(e){ e.preventDefault(); windowMenu(this); });
  g('ksdMHelp').addEventListener('pointerdown',function(e){ e.preventDefault(); barMenu(this,[{t:'Alio Help Centre',fn:function(){ openApp(appForPage('help')); }},{t:'Keyboard shortcuts',fn:function(){ openSettings2('about'); }}]); });
  g('ksdMAi').addEventListener('click',function(){ closeMenu(); try{ toggleChat(); }catch(e){ toast('The assistant is not available right now'); } });
  g('ksdMSearch').addEventListener('click',function(){ closeMenu(); openSpotlight(); });
  g('ksdMMc').addEventListener('click',function(){ closeMenu(); openMissionControl(); });
  g('ksdMCc').addEventListener('pointerdown',function(e){ e.preventDefault(); controlCenter(this); });
  g('ksdMBell').addEventListener('click',function(){ closeMenu(); openApp('inbox'); });
  g('ksdMUser').addEventListener('pointerdown',function(e){ e.preventDefault(); userMenu(this); });
  updateBar(); updateClock(); updateUser();
}
function windowMenu(btn){
  var f=topWin(), n=wcount(), it=[];
  it.push({t:'Minimize',k:'Alt+Shift+↓',off:!f,fn:function(){ minimizeWin(f); }});
  it.push({t:(f&&f.state==='max')?'Restore':'Maximize',k:'Alt+Shift+↑',off:!f,fn:function(){ toggleMax(f); }});
  it.push({t:'Snap left',k:'Alt+Shift+←',off:!f,fn:function(){ snapWin(f,'l'); }});
  it.push({t:'Snap right',k:'Alt+Shift+→',off:!f,fn:function(){ snapWin(f,'r'); }});
  it.push({t:'Tile windows',off:n<2,fn:tileAll});
  it.push('-');
  if(n){ it.push({hd:'Open windows'}); order.forEach(function(id){ var w=W[id]; if(w) it.push({t:w.app.name+(w.state==='min'?' (minimized)':''),ck:topWin()===w,fn:function(){ if(w.state==='min') restoreWin(w); focusWin(w); }}); }); it.push('-'); }
  it.push({t:'Show Desktop',fn:showDesktop});
  it.push({t:'Close window',k:'Alt+Shift+W',off:!f,fn:function(){ askClose([f]); }});
  it.push({t:'Close all windows',off:!n,fn:function(){ askClose(Object.keys(W).map(function(k){ return W[k]; })); }});
  barMenu(btn,it);
}
function showDesktop(){ Object.keys(W).forEach(function(k){ minimizeWin(W[k]); }); blurAll(); }
function exitDesktop(){ askClose(Object.keys(W).map(function(k){ return W[k]; }),function(){ try{ ksUserSetTheme(ksFallbackTheme()); }catch(e){ try{ setTheme('clarity',true); }catch(_){} } },true); }
/* apps that can hold progress (a game, a running timer, a file being worked on) ask before they close */
var RISKY={timer:1,typing:1,handwritingfont:1,pdftools:1,science:1,games:1,health:1,breath:1,lunghold:1,breathrate:1,heartrate:1,heartzone:1,stress:1,eyetimer:1};
function isRisky(a){ return !!(a && (RISKY[a.id] || a.grp==='Games')); }
var dlgEl=null;
function closeDlg(){ if(dlgEl){ dlgEl.remove(); dlgEl=null; } }
function askClose(ws,after,leaving){
  ws=ws.filter(function(w){ return w && W[w.id]; });
  var go=function(){ ws.forEach(function(w){ closeWin(w); }); if(after) after(); };
  var risky=ws.filter(function(w){ return isRisky(w.app); });
  if(!risky.length){ go(); return; }
  closeDlg(); var names=risky.map(function(w){ return w.app.name; });
  var d=el('div','ksd-dlg'); dlgEl=d;
  d.innerHTML='<div class="bx" role="alertdialog" aria-modal="true"><h3>'+(leaving?'Leave Desktop mode?':(names.length>1?'Close these windows?':'Close '+esc(names[0])+'?'))+'</h3>'
    +'<p>'+esc(names.join(', '))+(names.length>1?' may have':' may have')+' something in progress, like a game, a running timer or work you have not finished. If you close '+(names.length>1?'them':'it')+' now, that progress will be lost.</p>'
    +'<div class="bt"><button data-a="n">Keep open</button><button class="d" data-a="y">'+(leaving?'Leave anyway':'Close anyway')+'</button></div></div>';
  root.appendChild(d);
  $('[data-a=n]',d).onclick=closeDlg; $('[data-a=y]',d).onclick=function(){ closeDlg(); go(); };
  d.addEventListener('pointerdown',function(e){ if(e.target===d) closeDlg(); });
  setTimeout(function(){ var b=$('[data-a=n]',d); if(b) b.focus(); },30);
}
function controlCenter(btn){
  if(btn.classList.contains('open')){ closeMenu(); return; }
  closeMenu(); btn.classList.add('open'); var r=btn.getBoundingClientRect();
  var m=el('div','ksd-menu cc ksd-blur'); var mode=''; try{ mode=colorMode; }catch(e){}
  m.innerHTML='<div class="row"><div class="lb">Appearance</div><div class="ksd-seg"><button data-m="light"'+(mode==='light'?' class="on"':'')+'>Light</button><button data-m="dark"'+(mode==='dark'?' class="on"':'')+'>Dark</button><button data-m="system"'+(mode==='system'?' class="on"':'')+'>Auto</button></div></div>'
   +'<div class="row"><div class="lb">Dock size</div><input type="range" min="40" max="72" value="'+S.size+'" id="ksdCcSz"></div>'
   +'<div class="tg"><span>Magnification</span><button class="ksd-sw'+(S.mag?' on':'')+'" data-t="mag"></button></div>'
   +'<div class="tg"><span>Hide the Dock automatically</span><button class="ksd-sw'+(S.autohide?' on':'')+'" data-t="auto"></button></div>'
   +'<div class="tg"><span>Reduce transparency</span><button class="ksd-sw'+(S.solid?' on':'')+'" data-t="solid"></button></div>'
   +'<div class="sep"></div><div class="it" data-a="wall"><span>Change wallpaper…</span></div><div class="it" data-a="exit"><span>Exit Desktop mode</span></div>';
  $$('.ksd-sw',m).forEach(function(b){ b.style.cssText='width:40px;height:23px;border-radius:12px;background:'+(b.classList.contains('on')?'var(--acc)':'rgba(128,128,128,.4)')+';position:relative;flex:none';
    b.innerHTML='<i style="position:absolute;top:2px;left:'+(b.classList.contains('on')?19:2)+'px;width:19px;height:19px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.4)"></i>';
    b.onclick=function(){ var t=b.dataset.t; if(t==='mag') S.mag=!S.mag; if(t==='auto') S.autohide=!S.autohide; if(t==='solid') S.solid=!S.solid; save(); applyDockPrefs(); controlCenter(btn); controlCenter(btn); }; });
  $$('.ksd-seg button',m).forEach(function(b){ b.onclick=function(){ try{ ksSetColorMode(b.dataset.m); }catch(e){} $$('.ksd-seg button',m).forEach(function(x){ x.classList.toggle('on',x===b); }); }; });
  $('#ksdCcSz',m).oninput=function(){ S.size=+this.value; save(); renderDock(); };
  $('[data-a=wall]',m).onclick=function(){ closeMenu(); openSettings2('wallpaper'); };
  $('[data-a=exit]',m).onclick=function(){ closeMenu(); exitDesktop(); };
  root.appendChild(m); placeMenu(m,r.right,BAR+2,true); menuEl=m;
}
function userMenu(btn){
  var u=window.currentUser, it=[];
  if(u){ it.push({hd:u.displayName||u.email||'Signed in'}); it.push({t:'Account & profile…',fn:function(){ openApp(appForPage('auth')); }}); it.push({t:'Alio settings…',fn:function(){ try{ openSettings(); }catch(e){} }}); }
  else{ it.push({t:'Sign in…',fn:function(){ openApp(appForPage('auth')); }}); it.push({t:'Alio settings…',fn:function(){ try{ openSettings(); }catch(e){} }}); }
  it.push('-'); it.push({t:'Exit Desktop mode',fn:exitDesktop});
  barMenu(btn,it,true);
}
function updateBar(){
  if(!barEl) return; var f=topWin(), nm=$('#ksdMApp',barEl); if(nm) nm.textContent=(f&&f.el.classList.contains('focus'))?f.app.name:'Alio';
}
function updateClock(){
  var c=$('#ksdClock',barEl); if(!c) return; var d=new Date();
  try{ c.textContent=d.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})+'  '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}); }catch(e){ c.textContent=d.toString().slice(0,21); }
}
function updateUser(){
  if(!barEl) return; var av=$('#ksdMUser .av',barEl), u=window.currentUser; if(!av) return;
  if(u && u.photoDataUrl){ av.style.backgroundImage='url("'+u.photoDataUrl+'")'; av.textContent=''; }
  else{ av.style.backgroundImage=''; av.textContent=u?String(u.displayName||u.email||'?').charAt(0).toUpperCase():'?'; }
}
function updateBadges(){
  var n=unreadN(), b=$('#ksdMBell .bd',barEl); if(b){ b.style.display=n?'grid':'none'; b.textContent=n>99?'99+':n; }
  var d=$('.ksd-dk[data-id="inbox"]',dockEl); if(d){ var x=$('.bd',d); if(n){ if(!x){ x=el('span','bd'); d.appendChild(x); } x.textContent=n>99?'99+':n; } else if(x) x.remove(); }
}

/* ---------- overlays: Spotlight, Launchpad, Mission Control ---------- */
function closeOverlays(){ [spotEl,lpEl,mcEl].forEach(function(o){ if(o) o.classList.remove('on'); }); closeMenu(); lpMode='open'; }
var spotSel=0, spotRes=[];
function openSpotlight(){
  closeOverlays(); spotEl.classList.add('on'); var i=$('input',spotEl); i.value=''; spotSearch(''); setTimeout(function(){ i.focus(); },30);
}
function spotSearch(q){
  q=q.trim().toLowerCase(); var out=[]; spotSel=0;
  var toks=q.split(/\s+/).filter(Boolean);
  function match(s){ s=String(s||'').toLowerCase(); return toks.every(function(t){ return s.indexOf(t)>=0; }); }
  if(!q){ spotRes=[]; }
  else{
    var seen={};
    getApps().list.forEach(function(a){ if(blocked(a)&&!isAdmin()) return; if(match(a.name+' '+(a.desc||'')+' '+a.grp)){ out.push({t:a.name,s:a.desc||a.grp,icon:a.icon,id:a.id,kind:'App',run:function(){ openApp(a); }}); seen[a.page]=1; } });
    try{ (SEARCH_ITEMS||[]).forEach(function(it){
      if(out.length>=40||!it||!it.title||seen[it.id]) return;
      if(it.flag && !isAdmin() && !ksFlagOn(it.flag)) return;
      var hay=it.title+' '+(it.description||'')+' '+(it.keywords||[]).join(' ')+' '+(it.aliases||[]).join(' ');
      if(match(hay) && !/^help-/.test(it.id)){ var ic=String(it.icon||'🔎'); out.push({t:it.title,s:it.description||it.category||'',icon:ic.charAt(0)==='<'?'🔎':ic,kind:it.category||'',run:function(){ it.action&&it.action(); }}); }
    }); }catch(e){}
    spotRes=out.slice(0,9);
  }
  var box=$('.res',spotEl); box.innerHTML='';
  spotRes.forEach(function(r,i){ var d=el('div','r'+(i===spotSel?' sel':''),'<span class="ti" style="background:var(--g2)">'+esc(r.icon)+'</span><div><b>'+esc(r.t)+'</b><small>'+esc(String(r.s).slice(0,80))+'</small></div><span class="ct">'+esc(r.kind)+'</span>');
    d.onclick=function(){ spotRun(i); }; d.onmousemove=function(){ spotSel=i; $$('.r',box).forEach(function(x,j){ x.classList.toggle('sel',j===i); }); }; box.appendChild(d); });
  if(q && !spotRes.length) box.innerHTML='<div class="r" style="opacity:.6">No results for “'+esc(q)+'”</div>';
}
function spotRun(i){ var r=spotRes[i]; if(!r) return; closeOverlays(); setTimeout(function(){ try{ r.run(); }catch(e){ console.error(e); } },0); }
var lpMode='open', lpDragged=false;
function lpDragInit(b,a){
  b.addEventListener('pointerdown',function(ev){
    if(ev.button>0 || ev.pointerType!=='mouse') return; /* touch: press and hold opens the menu instead */
    var sx=ev.clientX, sy=ev.clientY, ghost=null;
    function mv(e){
      if(!ghost){ if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)<8) return; lpDragged=true; ghost=el('div','ksd-ghost','<span>'+(a.icon||'🧩')+'</span>'); ghost.style.background=tileBg(a.id); root.appendChild(ghost); lpEl.classList.add('drag'); }
      ghost.style.left=e.clientX+'px'; ghost.style.top=e.clientY+'px';
    }
    function up(e){
      D.removeEventListener('pointermove',mv,true); D.removeEventListener('pointerup',up,true);
      if(!ghost){ return; } ghost.remove(); lpEl.classList.remove('drag'); setTimeout(function(){ lpDragged=false; },50);
      var dr=dockEl.getBoundingClientRect();
      if(e.clientY>dr.top-24 && e.clientX>dr.left-24 && e.clientX<dr.right+24){ if(S.dock.indexOf(a.id)<0){ dockAdd(a.id); toast(a.name+' added to the Dock'); } else toast('Already in the Dock'); closeOverlays(); return; }
      if(e.clientY<BAR+4) return;
      var c=Math.round((e.clientX-PADX-CW/2)/CW), r=Math.round((e.clientY-BAR-PADY-CH/2)/CH); closeOverlays(); deskAdd(a.id,Math.max(0,c),Math.max(0,r));
    }
    D.addEventListener('pointermove',mv,true); D.addEventListener('pointerup',up,true);
  });
}
function openLaunchpad(mode){
  closeOverlays(); lpMode=mode||'open'; lpEl.classList.add('on'); var i=$('input',lpEl); i.value=''; renderLaunchpad(''); setTimeout(function(){ i.focus(); },30);
  $('.hint',lpEl).textContent=lpMode==='pickDesk'?'Choose an app to put on the Desktop':'Drag any icon onto the Desktop or the Dock · right-click for more';
}
function renderLaunchpad(q){
  q=q.trim().toLowerCase(); var g=$('.grid',lpEl); g.innerHTML=''; var cur='';
  var L=getApps().list.filter(function(a){ return !q || (a.name+' '+(a.desc||'')+' '+a.grp).toLowerCase().indexOf(q)>=0; });
  var groups=['Social','Productivity','Tools','Games','Health','Fun','System','Other'];
  groups.forEach(function(gr){
    var items=L.filter(function(a){ return a.grp===gr; }); if(!items.length) return;
    g.appendChild(el('div','gl',esc(gr)));
    items.forEach(function(a){
      var b=el('button','ap'+(blocked(a)?' dim':'')); b.setAttribute('aria-label',a.name);
      b.innerHTML='<div class="ti" style="background:'+tileBg(a.id)+'">'+tileHTML(a)+'</div><span class="n">'+esc(a.name)+'</span>';
      b.onclick=function(){ if(lpDragged){ lpDragged=false; return; } if(lpMode==='pickDesk'){ closeOverlays(); deskAdd(a.id); } else openApp(a); };
      lpDragInit(b,a);
      b.addEventListener('contextmenu',function(e){ e.preventDefault(); dockMenu(a,e.clientX,e.clientY); });
      longPress(b,function(x,y){ dockMenu(a,x,y); });
      g.appendChild(b);
    });
  });
  if(!g.children.length) g.innerHTML='<div class="gl">No apps match</div>';
}
function openMissionControl(auto){
  closeOverlays(); refreshMC(); mcEl.classList.add('on'); mcEl.dataset.auto=auto?'1':'';
}
function refreshMC(){
  if(!mcEl) return; mcEl.innerHTML='';
  var ids=order.slice().reverse().filter(function(id){ return W[id]; });
  if(!ids.length){ mcEl.appendChild(el('div','em','No windows open — click an app in the Dock to start.')); return; }
  ids.forEach(function(id){ var w=W[id], a=w.app;
    var c=el('div','cd','<div class="ti" style="background:'+tileBg(a.id)+'">'+tileHTML(a)+'</div><b>'+esc(a.name)+'</b><small style="opacity:.6">'+(w.state==='min'?'Minimized':'Open')+'</small><span class="x" role="button" aria-label="Close">×</span>');
    c.onclick=function(e){ if(e.target.classList.contains('x')){ e.stopPropagation(); askClose([w]); return; } closeOverlays(); if(w.state==='min') restoreWin(w); focusWin(w); };
    mcEl.appendChild(c); });
}

/* ---------- Settings (a real app in the dock) ---------- */
function openSettings2(pane){
  var a=appBy('settings'); var w=W.settings;
  if(w){ if(w.state==='min') restoreWin(w); focusWin(w); buildSettings(w.nat,pane); return; }
  a.pane=pane; openApp(a); delete a.pane;
}
var setPane='appearance', setTimer=null;
function buildSettings(host,pane){
  setPane=pane||setPane; host.innerHTML='';
  var PANES=[['appearance','🎨','Appearance'],['wallpaper','🖼️','Wallpaper'],['dock','🧲','Dock'],['desktop','🗂️','Desktop'],['account','👤','Account'],['about','ℹ️','About']];
  var wrap=el('div','ksd-set'), sd=el('div','sd'), mn=el('div','mn');
  PANES.forEach(function(p){ var b=el('button',p[0]===setPane?'on':'', '<span>'+p[1]+'</span>'+p[2]); b.onclick=function(){ buildSettings(host,p[0]); }; sd.appendChild(b); });
  wrap.appendChild(sd); wrap.appendChild(mn); host.appendChild(wrap); clearInterval(setTimer);
  function sw(on){ return '<button class="sw'+(on?' on':'')+'" role="switch" aria-checked="'+(!!on)+'"></button>'; }
  function re(){ buildSettings(host,setPane); }
  if(setPane==='appearance'){
    var mode=''; try{ mode=colorMode; }catch(e){}
    mn.innerHTML='<h2>Appearance</h2><p class="sub">How the desktop and your windows look.</p><div class="card"><div class="rw"><b>Mode</b><div class="ksd-seg" style="width:240px"><button data-m="light">Light</button><button data-m="dark">Dark</button><button data-m="system">Auto</button></div></div>'
      +'<div class="rw"><span>Reduce transparency</span>'+sw(S.solid)+'</div></div>'
      +'<div class="card"><div class="rw"><span>More colours, text size and personalisation live in your Alio settings.</span><button class="btn g" id="ksdOpenAlio">Open Alio settings</button></div></div>';
    $$('.ksd-seg button',mn).forEach(function(b){ b.classList.toggle('on',b.dataset.m===mode); b.onclick=function(){ try{ ksSetColorMode(b.dataset.m); }catch(e){} re(); }; });
    $('.sw',mn).onclick=function(){ S.solid=!S.solid; save(); applyDockPrefs(); re(); };
    $('#ksdOpenAlio',mn).onclick=function(){ try{ openSettings(); }catch(e){} };
  }
  else if(setPane==='wallpaper'){
    var h='<h2>Wallpaper</h2><p class="sub">Pick a picture for your desktop. It is saved on this device only.</p><div class="card"><div class="wg">';
    WALLS.forEach(function(w){ h+='<button class="wt '+w[0]+(S.wall===w[0]?' on':'')+'" data-w="'+w[0]+'" aria-label="'+w[1]+'"><small>'+w[1]+'</small></button>'; });
    h+='<button class="wt'+(S.wall==='photo'?' on':'')+'" data-w="photo" style="background:var(--g2);display:grid;place-items:center" aria-label="Upload a photo"><span style="font-size:22px">＋</span><small>Your photo…</small></button>';
    if(cfbImage()) h+='<button class="wt'+(S.wall==='cfb'?' on':'')+'" data-w="cfb" style="background-image:url(\''+cfbImage()+'\')" aria-label="My Alio background"><small>My Alio background</small></button>';
    h+='</div></div>'; mn.innerHTML=h;
    $$('.wt',mn).forEach(function(b){ b.onclick=function(){ var w=b.dataset.w; if(w==='photo'){ pickWallFile(re); } else{ setWall(w); re(); } }; });
  }
  else if(setPane==='dock'){
    mn.innerHTML='<h2>Dock</h2><p class="sub">Choose which apps live in the Dock and how it behaves. You can also drag icons in the Dock to reorder them, or drag one up and away to remove it.</p>'
      +'<div class="card"><div class="rw"><span>Size</span><input type="range" min="40" max="72" value="'+S.size+'" id="ksdSz"></div><div class="rw"><span>Magnification</span>'+sw(S.mag)+'</div><div class="rw"><span>Hide the Dock automatically</span>'+sw(S.autohide)+'</div></div>'
      +'<div class="card ls" id="ksdDl"></div>';
    var sws=$$('.sw',mn); sws[0].onclick=function(){ S.mag=!S.mag; save(); applyDockPrefs(); re(); }; sws[1].onclick=function(){ S.autohide=!S.autohide; save(); applyDockPrefs(); re(); };
    $('#ksdSz',mn).oninput=function(){ S.size=+this.value; save(); renderDock(); };
    var lst=$('#ksdDl',mn);
    function row(a,i){ var inD=S.dock.indexOf(a.id)>=0; var r=el('div','li','<span class="ti" style="background:'+tileBg(a.id)+'">'+esc(a.icon)+'</span><span class="nm">'+esc(a.name)+'</span>'
        +(inD?'<button class="mini" data-u aria-label="Move left">←</button><button class="mini" data-d aria-label="Move right">→</button>':'')+sw(inD));
      r.querySelector('.sw').onclick=function(){ if(inD) dockRemove(a.id); else dockAdd(a.id); re(); };
      if(inD){ r.querySelector('[data-u]').onclick=function(){ var j=S.dock.indexOf(a.id); if(j>0){ S.dock.splice(j,1); S.dock.splice(j-1,0,a.id); save(); renderDock(); re(); } };
        r.querySelector('[data-d]').onclick=function(){ var j=S.dock.indexOf(a.id); if(j<S.dock.length-1){ S.dock.splice(j,1); S.dock.splice(j+1,0,a.id); save(); renderDock(); re(); } }; }
      return r; }
    S.dock.forEach(function(id){ var a=appBy(id); if(a) lst.appendChild(row(a)); });
    lst.appendChild(el('div','sub','<br>More apps'));
    getApps().list.filter(function(a){ return S.dock.indexOf(a.id)<0 && !a.native; }).forEach(function(a){ lst.appendChild(row(a)); });
    var rb=el('button','btn g','Reset Dock'); rb.style.marginTop='10px'; rb.onclick=function(){ S.dock=DEFDOCK.slice(); save(); renderDock(); re(); }; lst.appendChild(rb);
  }
  else if(setPane==='desktop'){
    mn.innerHTML='<h2>Desktop</h2><p class="sub">Put apps on the desktop. Drag them anywhere; they snap to a grid.</p><div class="card"><div class="rw"><span>Add an app</span><button class="btn" id="ksdAd">Choose app…</button></div><div class="rw"><span>Sort icons by name</span><button class="btn g" id="ksdSo">Sort</button></div></div><div class="card ls" id="ksdDsk"></div>';
    $('#ksdAd',mn).onclick=function(){ openLaunchpad('pickDesk'); };
    $('#ksdSo',mn).onclick=function(){ deskSort(); re(); };
    var l2=$('#ksdDsk',mn); if(!S.desk.length) l2.innerHTML='<div class="sub" style="margin:0">No icons on the desktop yet.</div>';
    S.desk.forEach(function(d){ var a=appBy(d.id); if(!a) return; var r=el('div','li','<span class="ti" style="background:'+tileBg(a.id)+'">'+esc(a.icon)+'</span><span class="nm">'+esc(a.name)+'</span><button class="mini">Remove</button>'); r.querySelector('button').onclick=function(){ deskRemove(d.id); re(); }; l2.appendChild(r); });
  }
  else if(setPane==='account'){
    var u=window.currentUser;
    mn.innerHTML='<h2>Account</h2><p class="sub">'+(u?'Signed in as <b>'+esc(u.displayName||u.email||'you')+'</b>':'You are not signed in.')+'</p><div class="card"><div class="rw"><span>'+(u?'Profile, security, notifications, language and everything else in Alio':'Sign in to use Community and Messages')+'</span><button class="btn" id="ksdA1">'+(u?'Open Alio settings':'Sign in')+'</button></div></div>';
    $('#ksdA1',mn).onclick=function(){ if(u){ try{ openSettings(); }catch(e){} } else openApp(appForPage('auth')); };
  }
  else{
    var admin=isAdmin();
    mn.innerHTML='<h2>About Alio</h2><p class="sub">Free tools, games and more.</p><div class="card"><div class="rw"><b>Alio Desktop</b><span>Aurora theme</span></div><div class="rw"><span>A product by KS Tech</span><span>Created by Kiran Sankar Chattopadhyay with the assistance of AI</span></div><div class="rw"><span>Contact</span><span>contactkstech@gmail.com</span></div></div>'
      +'<div class="card"><b>Keyboard shortcuts</b><div style="height:8px"></div>'
      +[['Search','Ctrl + Space'],['Mission Control (all windows)','F3'],['Next window','Alt + `'],['Snap left / right','Alt + Shift + ← / →'],['Maximize / restore','Alt + Shift + ↑'],['Minimize','Alt + Shift + ↓'],['Close window','Alt + Shift + W'],['Close menus','Esc']].map(function(s){ return '<div class="sc"><span>'+s[0]+'</span><kbd>'+s[1]+'</kbd></div>'; }).join('')+'</div>'
      +(admin?'<div class="card"><b>Diagnostics (admins only)</b><div id="ksdDiag" class="sub" style="margin:8px 0 0"></div></div>':'');
    if(admin){ var tick=function(){ var d=$('#ksdDiag',mn); if(!d){ clearInterval(setTimer); return; } d.innerHTML=diag(); }; tick(); setTimer=setInterval(tick,2000); }
  }
}
function listeners(w){ try{ return (w?w.iframe.contentWindow:window).__ksListeners||null; }catch(e){ return null; } }
function diag(){
  var m=listeners(), s='Desktop page: <b>'+(m?m.active:'?')+'</b> live listeners · ~'+(m?m.docs:'?')+' documents received<br>';
  var act=m?m.active:0, docs=m?m.docs:0;
  Object.keys(W).forEach(function(k){ var w=W[k]; if(!w.iframe) return; var l=listeners(w); if(l){ act+=l.active; docs+=l.docs; } s+=esc(w.app.name)+': <b>'+(l?l.active:'–')+'</b> listeners · ~'+(l?l.docs:'–')+' docs<br>'; });
  return s+'<br>Total: <b>'+act+'</b> live listeners · about <b>'+docs+'</b> documents received this visit (a rough count of Firestore reads).';
}

/* ---------- keyboard ---------- */
function hotkey(code,key,ctrl,alt,shift){
  if(ctrl && code==='Space'){ if(spotEl.classList.contains('on')) closeOverlays(); else openSpotlight(); return true; }
  if(code==='F3'){ if(mcEl.classList.contains('on')) closeOverlays(); else openMissionControl(); return true; }
  if(alt && code==='Backquote'){ var ids=order.filter(function(id){ return W[id]; }); if(ids.length>1){ var w=W[ids[0]]; if(w.state==='min') restoreWin(w); focusWin(w); } return true; }
  if(alt && shift){
    var f=topWin();
    if(key==='ArrowLeft'){ f&&snapWin(f,'l'); return true; } if(key==='ArrowRight'){ f&&snapWin(f,'r'); return true; }
    if(key==='ArrowUp'){ f&&toggleMax(f); return true; } if(key==='ArrowDown'){ if(f){ if(f.state!=='normal') restoreNormal(f,true); else minimizeWin(f); } return true; }
    if(code==='KeyW'){ f&&askClose([f]); return true; }
  }
  return false;
}
function onKey(e){
  if(!on) return;
  if(e.key==='Escape'){ if(dlgEl){ closeDlg(); e.preventDefault(); return; } if(menuEl||spotEl.classList.contains('on')||lpEl.classList.contains('on')||mcEl.classList.contains('on')){ closeOverlays(); e.preventDefault(); } return; }
  if(spotEl.classList.contains('on')){
    if(e.key==='ArrowDown'){ spotSel=Math.min(spotRes.length-1,spotSel+1); spotHi(); e.preventDefault(); return; }
    if(e.key==='ArrowUp'){ spotSel=Math.max(0,spotSel-1); spotHi(); e.preventDefault(); return; }
    if(e.key==='Enter'){ spotRun(spotSel); e.preventDefault(); return; }
  }
  if(hotkey(e.code,e.key,e.ctrlKey,e.altKey,e.shiftKey)) e.preventDefault();
}
function spotHi(){ $$('.res .r',spotEl).forEach(function(x,j){ x.classList.toggle('sel',j===spotSel); }); var s=$('.res .r.sel',spotEl); if(s&&s.scrollIntoView) s.scrollIntoView({block:'nearest'}); }

/* ---------- desktop right-click ---------- */
function desktopMenu(x,y){
  showMenu([{t:'Add app to Desktop…',fn:function(){ openLaunchpad('pickDesk'); }},{t:'Change wallpaper…',fn:function(){ openSettings2('wallpaper'); }},{t:'Sort icons',off:S.desk.length<2,fn:deskSort},'-',{t:'All apps',fn:openLaunchpad},{t:'Settings…',fn:function(){ openSettings2('appearance'); }}],x,y);
}

/* ---------- messages from windows ---------- */
function winBySource(src){ var k=Object.keys(W); for(var i=0;i<k.length;i++){ var w=W[k[i]]; try{ if(w.iframe && w.iframe.contentWindow===src) return w; }catch(e){} } return null; }
function appearance(){
  var cs=H.style, vars={}; ['--accent','--accent2','--accent-glow','--cfb-a','--cfb-a2','--cfb-glow'].forEach(function(k){ var v=cs.getPropertyValue(k); vars[k]=v||null; });
  return {ksd:1,type:'sync',theme:H.getAttribute('data-theme'),palette:H.getAttribute('data-palette'),vars:vars,cfb:H.hasAttribute('data-cfb-accent')};
}
function sendSync(w){ try{ if(w.iframe&&w.iframe.contentWindow) w.iframe.contentWindow.postMessage(appearance(),ORIGIN); }catch(e){} }
var syncT=null; function syncAll(){ clearTimeout(syncT); syncT=setTimeout(function(){ Object.keys(W).forEach(function(k){ sendSync(W[k]); }); },60); }
function onMessage(e){
  if(e.origin!==ORIGIN) return; var m=e.data; if(!m || m.ksd!==1) return;
  var w=winBySource(e.source); if(!w) return;
  if(m.type==='ready'){ sendSync(w); if(w.done) w.done(); }
  else if(m.type==='focus'){ if(!w.el.classList.contains('focus')) focusWin(w); closeMenu(); }
  else if(m.type==='open' && typeof m.page==='string'){ openApp(appForPage(String(m.page).replace(/[^A-Za-z0-9_-]/g,''))); }
  else if(m.type==='key'){ if(!hotkey(m.code,m.key,m.ctrl,m.alt,m.shift)){ /* ignore */ } }
}

/* ---------- build / teardown ---------- */
var mo=null, clockT=null, badgeT=null, rsT=null;
function build(){
  root=el('div'); root.id='ksDesk'; root.setAttribute('role','application'); root.setAttribute('aria-label','Alio desktop');
  root.innerHTML='<div class="ksd-wall"></div><div class="ksd-icons"></div><div class="ksd-wins"><div class="ksd-snap"></div></div>'
    +'<div id="ksdBar" class="ksd-blur"></div><div id="ksdHot"></div><div id="ksdDockWrap"><div id="ksdDock" class="ksd-blur" role="toolbar" aria-label="Dock"></div></div>'
    +'<div class="ksd-ov" id="ksdSpot"><div class="ksd-spot ksd-blur"><input type="text" placeholder="Search apps, games and settings" aria-label="Search" autocomplete="off" spellcheck="false"><div class="res"></div></div></div>'
    +'<div class="ksd-ov ksd-lp" id="ksdLp"><input class="sb" type="text" placeholder="Search" aria-label="Search apps" autocomplete="off"><div class="hint" style="opacity:.7;margin-top:10px;min-height:18px"></div><div class="grid"></div></div>'
    +'<div class="ksd-ov ksd-mc" id="ksdMc"></div><div class="ksd-toast" role="status"></div>';
  D.body.appendChild(root);
  wallEl=$('.ksd-wall',root); iconsEl=$('.ksd-icons',root); winsEl=$('.ksd-wins',root); snapEl=$('.ksd-snap',root); barEl=$('#ksdBar',root);
  dockWrap=$('#ksdDockWrap',root); dockEl=$('#ksdDock',root); spotEl=$('#ksdSpot',root); lpEl=$('#ksdLp',root); mcEl=$('#ksdMc',root); toastEl=$('.ksd-toast',root);
  applyWall(); buildBar(); dockSetup(); renderIcons();
  /* spotlight / launchpad inputs */
  $('input',spotEl).addEventListener('input',function(){ spotSearch(this.value); });
  spotEl.addEventListener('pointerdown',function(e){ if(e.target===spotEl) closeOverlays(); });
  $('input',lpEl).addEventListener('input',function(){ renderLaunchpad(this.value); });
  lpEl.addEventListener('pointerdown',function(e){ if(e.target===lpEl||e.target.classList.contains('grid')) closeOverlays(); });
  mcEl.addEventListener('pointerdown',function(e){ if(e.target===mcEl) closeOverlays(); });
  /* desktop interactions */
  var bg=function(e){ return e.target===iconsEl||e.target===wallEl||e.target===winsEl; };
  root.addEventListener('pointerdown',function(e){
    if(menuEl && !menuEl.contains(e.target) && !e.target.closest('#ksdBar .mb')) closeMenu();
    if(bg(e)){ selDesk=null; $$('.ksd-di',iconsEl).forEach(function(x){ x.classList.remove('sel'); }); blurAll(); }
  });
  root.addEventListener('contextmenu',function(e){ if(bg(e)){ e.preventDefault(); desktopMenu(e.clientX,e.clientY); } });
  longPress(iconsEl,function(x,y){ desktopMenu(x,y); });
  D.addEventListener('keydown',onKey,true);
  window.addEventListener('beforeunload',onUnload);
  window.addEventListener('message',onMessage);
  clockT=setInterval(updateClock,20000); badgeT=setInterval(function(){ updateBadges(); },4000);
  window.addEventListener('ks-auth',onAuthEv);
  mo=new MutationObserver(syncAll); mo.observe(H,{attributes:true,attributeFilter:['data-theme','data-palette','style','data-cfb-accent']});
  if(/[?&]debug=1/.test(location.search)){ var hud=el('div','','');
    hud.style.cssText='position:absolute;left:8px;bottom:8px;z-index:250;font:11px/1.4 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.6);padding:4px 8px;border-radius:6px;pointer-events:none';
    root.appendChild(hud); hudT=setInterval(function(){ hud.innerHTML=diag().replace(/<br>/g,' | '); },2000); }
}
function onUnload(e){ if(Object.keys(W).some(function(k){ return isRisky(W[k].app); })){ e.preventDefault(); e.returnValue=''; return ''; } }
function onAuthEv(){ apps=null; updateUser(); renderDock(); renderIcons(); updateBadges(); }
function activate(){
  if(on) return; on=true; H.classList.add('ks-aurora-on'); closeSettingsDrawerSafe(); build(); updateBadges();
}
function closeSettingsDrawerSafe(){ try{ var d=$('#settingsDrawer'); if(d&&d.classList.contains('open')) closeSettings(); }catch(e){} }
function deactivate(){
  if(!on) return; on=false;
  Object.keys(W).forEach(function(k){ var w=W[k]; try{ if(w.iframe) w.iframe.src='about:blank'; }catch(e){} }); W={}; order=[];
  clearInterval(clockT); clearInterval(badgeT); clearInterval(hudT); clearInterval(setTimer); if(mo) mo.disconnect();
  D.removeEventListener('keydown',onKey,true); window.removeEventListener('beforeunload',onUnload); window.removeEventListener('message',onMessage); window.removeEventListener('ks-auth',onAuthEv);
  if(wallURL){ try{ URL.revokeObjectURL(wallURL); }catch(e){} wallURL=null; }
  if(root) root.remove(); root=null; H.classList.remove('ks-aurora-on');
  try{ window.go(typeof curPage!=='undefined'&&curPage?curPage:'home'); }catch(e){}
}
function sync(){
  var want=false;
  try{ want=(typeof theme!=='undefined' && theme==='aurora') && ksAuroraOK() && ksAuroraPolicyOK(); }catch(e){}
  if(want&&!on) activate(); else if(!want&&on) deactivate();
}
window.ksAuroraSync=sync;

/* while the desktop is on, anything that asks Alio to "go" to a page opens it as a window instead */
var _goTop=window.go;
window.go=function(p){
  if(on){ if(p==='home'||!p){ closeOverlays(); return; } openApp(appForPage(String(p))); return; }
  return _goTop.apply(this,arguments);
};
var _afu=window.applyFeatureFlagUI;
if(typeof _afu==='function') window.applyFeatureFlagUI=function(){ var r=_afu.apply(this,arguments); try{ if(on){ apps=null; renderDock(); renderIcons(); } }catch(e){} return r; };

/* narrow window / phone: leave the desktop; wide again: come back (the saved theme choice is never changed) */
window.addEventListener('resize',function(){
  clearTimeout(rsT); rsT=setTimeout(function(){
    var okNow=false; try{ okNow=ksAuroraOK(); }catch(e){}
    if(on){ if(!okNow){ window.__ksNoSave=true; try{ setTheme('aurora'); }catch(e){} window.__ksNoSave=false; } else{ layoutAll(); measureDock(); renderIcons(); } }
    else if(okNow && typeof theme!=='undefined' && theme==='aurora'){ window.__ksNoSave=true; try{ setTheme('aurora'); }catch(e){} window.__ksNoSave=false; }
  },160);
});
window.ksAurora={open:function(id){ return openApp(id); },windows:function(){ return Object.keys(W); },state:function(){ return S; },on:function(){ return on; },toast:toast};
sync();
})();
