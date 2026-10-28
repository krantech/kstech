/* alio-health.js — Health tools (breathing, lung hold, breath rate, heart rate, heart zones, stress, eye timer, water).
   Loaded automatically by index.html the first time someone opens one of these pages (with the Alio loading screen).
   Keep this file in the same folder as index.html. */
const BREATH_MODES={
  box:{name:'Box Breathing',phases:['Inhale','Hold','Exhale','Hold'],times:[4,4,4,4],color:'#3D52D5'},
  '478':{name:'4-7-8 Breathing',phases:['Inhale','Hold','Exhale'],times:[4,7,8],color:'#a78bfa'},
  deep:{name:'Deep Breathing',phases:['Inhale','Exhale'],times:[5,5],color:'#4ade80'}
};
let breathMode='box';
/* helper: update button states */
function setHealthBtns(startId, pauseId, resumeId, resetId, state){
  const s=document.getElementById(startId);
  const p=pauseId?document.getElementById(pauseId):null;
  const r=resumeId?document.getElementById(resumeId):null;
  const rs=resetId?document.getElementById(resetId):null;
  // state: 'idle' | 'running' | 'paused'
  if(state==='idle'){
    if(s){s.className='btn btn-primary';s.disabled=false;}
    if(p){p.style.display='none';}
    if(r){r.style.display='none';}
    if(rs){rs.style.display='';}
  } else if(state==='running'){
    if(s){s.className='btn btn-running';s.disabled=true;}
    if(p){p.style.display='';}
    if(r){r.style.display='none';}
    if(rs){rs.style.display='';}
  } else if(state==='paused'){
    if(s){s.className='btn btn-paused';s.disabled=true;}
    if(p){p.style.display='none';}
    if(r){r.style.display='';}
    if(rs){rs.style.display='';}
  }
}

/* ── BREATHING EXERCISE ── */
function renderBreath(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('health')">← Health</button></div>
    <div class='inner-card'>
      <h2>🌬️ Breathing Exercise</h2>
      <p class='subtitle'>Follow the guide to calm your mind and body.</p>
      <div style='display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px'>
        <button class='calc-tab active' onclick='setBreathMode("box",this)'>📦 Box (4-4-4-4)</button>
        <button class='calc-tab' onclick='setBreathMode("478",this)'>✨ 4-7-8</button>
        <button class='calc-tab' onclick='setBreathMode("deep",this)'>🍃 Deep (5-5)</button>
      </div>
      <div id='breathCircleWrap' style='display:flex;flex-direction:column;align-items:center;padding:20px 0'>
        <div id='breathCircle' style='
          width:180px;height:180px;border-radius:50%;
          background:radial-gradient(circle,#1a2a4a,#0a0c14);
          border:3px solid #3D52D5;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          transition:transform 4s ease-in-out, border-color 1s, box-shadow 1s;
          box-shadow:0 0 30px rgba(61,82,213,0.3);
          margin-bottom:16px;
        '>
          <div id='breathPhaseLabel' style='font-family:Syne,sans-serif;font-weight:800;font-size:1.1rem;color:#fff'>Ready</div>
          <div id='breathCount' style='font-family:Rajdhani,sans-serif;font-size:2.5rem;font-weight:700;color:#3D52D5;line-height:1'>–</div>
        </div>
        <div id='breathCycleInfo' style='font-size:13px;color:var(--muted);margin-bottom:16px'>Cycle: <span id='breathCycleNum' style='color:var(--accent);font-weight:700'>0</span></div>
        <div style='display:flex;gap:10px;flex-wrap:wrap;justify-content:center'>
          <button class='btn btn-primary' id='breathStartBtn' onclick='startBreath()'>▶ Start</button>
          <button class='btn btn-secondary' id='breathPauseBtn' style='display:none' onclick='pauseBreath()'>⏸ Pause</button>
          <button class='btn btn-primary' id='breathResumeBtn' style='display:none' onclick='resumeBreath()'>▶ Resume</button>
          <button class='btn btn-ghost' id='breathResetBtn' onclick='resetBreath()'>↺ Reset</button>
        </div>
      </div>
      <div class='result-box' style='text-align:center'>
        <p>💡 <strong>Tip:</strong> Breathe through your nose during inhale and exhale slowly through your mouth. Regular practice reduces stress and improves focus.</p>
      </div>
    </div>
  </div>`;
}
function setBreathMode(mode, btn){
  breathMode=mode;
  resetBreath();
  document.querySelectorAll('.calc-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
}
function startBreath(){
  clearInterval(breathInterval);
  breathPhase=0; breathCycle=0;
  const cycleEl=document.getElementById('breathCycleNum');
  if(cycleEl) cycleEl.textContent='0';
  setHealthBtns('breathStartBtn','breathPauseBtn','breathResumeBtn','breathResetBtn','running');
  runBreathPhase();
}
let breathPausedPhaseTime=0;
function pauseBreath(){
  clearInterval(breathInterval);
  breathInterval=null;
  setHealthBtns('breathStartBtn','breathPauseBtn','breathResumeBtn','breathResetBtn','paused');
  const lbl=document.getElementById('breathPhaseLabel');
  if(lbl) lbl.textContent='Paused';
}
function resumeBreath(){
  setHealthBtns('breathStartBtn','breathPauseBtn','breathResumeBtn','breathResetBtn','running');
  runBreathPhase();
}
function resetBreath(){
  clearInterval(breathInterval); breathInterval=null;
  breathPhase=0; breathCycle=0;
  const circle=document.getElementById('breathCircle');
  if(circle){circle.style.transform='scale(1)';circle.style.borderColor='#3D52D5';circle.style.boxShadow='0 0 30px rgba(61,82,213,0.3)';}
  const lbl=document.getElementById('breathPhaseLabel');
  const cnt=document.getElementById('breathCount');
  const cycleEl=document.getElementById('breathCycleNum');
  if(lbl) lbl.textContent='Ready';
  if(cnt) cnt.textContent='–';
  if(cycleEl) cycleEl.textContent='0';
  setHealthBtns('breathStartBtn','breathPauseBtn','breathResumeBtn','breathResetBtn','idle');
}
function runBreathPhase(){
  const m=BREATH_MODES[breathMode];
  const phase=m.phases[breathPhase];
  const time=m.times[breathPhase];
  const circle=document.getElementById('breathCircle');
  const lbl=document.getElementById('breathPhaseLabel');
  const cnt=document.getElementById('breathCount');
  const cycleEl=document.getElementById('breathCycleNum');
  if(!circle) return;
  lbl.textContent=phase;
  circle.style.borderColor=m.color;
  circle.style.boxShadow=`0 0 40px ${m.color}66`;
  if(phase==='Inhale') circle.style.transform='scale(1.38)';
  else if(phase==='Exhale') circle.style.transform='scale(1)';
  let t=time;
  cnt.textContent=t;
  breathInterval=setInterval(()=>{
    t--;
    cnt.textContent=t;
    if(t<=0){
      clearInterval(breathInterval);
      breathPhase=(breathPhase+1)%m.phases.length;
      if(breathPhase===0){ breathCycle++; if(cycleEl) cycleEl.textContent=breathCycle; }
      runBreathPhase();
    }
  },1000);
}
function renderLungHold(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('health')">← Health</button></div>
    <div class='inner-card'>
      <h2>🫁 Lung Capacity Test</h2>
      <p class='subtitle'>Take a deep breath, press Start, then Stop when you can't hold anymore.</p>
      <div style='text-align:center;padding:30px 0'>
        <div id='lungDisplay' style='font-family:Rajdhani,sans-serif;font-size:5rem;font-weight:700;color:var(--accent);line-height:1;margin-bottom:8px;'>0.0s</div>
        <div id='lungStatus' style='font-size:14px;color:var(--muted);margin-bottom:24px'>Press Start when ready</div>
        <div style='display:flex;gap:10px;justify-content:center;flex-wrap:wrap'>
          <button class='btn btn-primary' id='lungStartBtn' onclick='startLung()'>🫁 Start</button>
          <button class='btn btn-secondary' id='lungPauseBtn' style='display:none' onclick='pauseLung()'>⏸ Pause</button>
          <button class='btn btn-primary' id='lungResumeBtn' style='display:none;font-size:13px;padding:10px 16px' onclick='resumeLung()'>▶ Resume</button>
          <button class='btn btn-secondary' id='lungStopBtn' style='display:none' onclick='stopLung()'>⏹ Done</button>
          <button class='btn btn-ghost' onclick='resetLung()'>↺ Reset</button>
        </div>
        <div id='lungResult' style='margin-top:24px'></div>
      </div>
      <div class='result-box' style='margin-top:0'>
        <p style='font-weight:600;color:var(--text);margin-bottom:8px'>📊 Average Hold Times:</p>
        <p>Untrained: <strong style='color:#f87171'>20–40s</strong> &nbsp;|&nbsp; Average: <strong style='color:#fbbf24'>40–60s</strong> &nbsp;|&nbsp; Good: <strong style='color:#4ade80'>60–90s</strong> &nbsp;|&nbsp; Excellent: <strong style='color:#a78bfa'>&gt;90s</strong></p>
      </div>
    </div>
  </div>`;
}
function startLung(){
  if(lungRunning) return;
  lungRunning=true; lungPaused=false; lungSeconds=0;
  document.getElementById('lungStatus').textContent='Hold your breath now... 🫁';
  document.getElementById('lungResult').innerHTML='';
  setHealthBtns('lungStartBtn','lungPauseBtn',null,null,'running');
  document.getElementById('lungStopBtn').style.display='';
  lungTimer=setInterval(()=>{
    lungSeconds+=0.1;
    const el=document.getElementById('lungDisplay');
    if(el) el.textContent=lungSeconds.toFixed(1)+'s';
  },100);
}
function pauseLung(){
  clearInterval(lungTimer); lungRunning=false; lungPaused=true;
  const p=document.getElementById('lungPauseBtn');
  const r=document.getElementById('lungResumeBtn');
  const s=document.getElementById('lungStartBtn');
  if(p) p.style.display='none';
  if(r) r.style.display='';
  if(s){s.className='btn btn-paused';s.disabled=true;}
  const st=document.getElementById('lungStatus');
  if(st) st.textContent='Paused — press Resume to continue';
}
function resumeLung(){
  lungRunning=true; lungPaused=false;
  const p=document.getElementById('lungPauseBtn');
  const r=document.getElementById('lungResumeBtn');
  const s=document.getElementById('lungStartBtn');
  if(p) p.style.display='';
  if(r) r.style.display='none';
  if(s){s.className='btn btn-running';s.disabled=true;}
  const st=document.getElementById('lungStatus');
  if(st) st.textContent='Hold your breath now... 🫁';
  lungTimer=setInterval(()=>{
    lungSeconds+=0.1;
    const el=document.getElementById('lungDisplay');
    if(el) el.textContent=lungSeconds.toFixed(1)+'s';
  },100);
}
function stopLung(){
  clearInterval(lungTimer); lungRunning=false; lungPaused=false;
  setHealthBtns('lungStartBtn','lungPauseBtn',null,null,'idle');
  const resumeBtn=document.getElementById('lungResumeBtn');
  const stopBtn=document.getElementById('lungStopBtn');
  if(resumeBtn) resumeBtn.style.display='none';
  if(stopBtn) stopBtn.style.display='none';
  const s=lungSeconds;
  let rating,color;
  if(s<20){rating='Keep practicing 💪';color='#f87171';}
  else if(s<40){rating='Untrained range';color='#f87171';}
  else if(s<60){rating='Average 👍';color='#fbbf24';}
  else if(s<90){rating='Good! 🌟';color='#4ade80';}
  else{rating='Excellent! 🏆';color='#a78bfa';}
  document.getElementById('lungStatus').textContent='Done!';
  document.getElementById('lungResult').innerHTML=`
    <div class='result-box' style='text-align:center'>
      <p>Your hold time</p>
      <strong style='color:${color};font-size:2rem'>${s.toFixed(1)}s</strong>
      <div style='margin-top:8px;font-size:14px;color:${color};font-weight:600'>${rating}</div>
    </div>`;
}
function resetLung(){
  clearInterval(lungTimer); lungRunning=false; lungPaused=false; lungSeconds=0;
  const d=document.getElementById('lungDisplay');
  const st=document.getElementById('lungStatus');
  const r=document.getElementById('lungResult');
  const resumeBtn=document.getElementById('lungResumeBtn');
  const stopBtn=document.getElementById('lungStopBtn');
  if(d) d.textContent='0.0s';
  if(st) st.textContent='Press Start when ready';
  if(r) r.innerHTML='';
  if(resumeBtn) resumeBtn.style.display='none';
  if(stopBtn) stopBtn.style.display='none';
  setHealthBtns('lungStartBtn','lungPauseBtn',null,null,'idle');
}
function renderBreathRate(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('health')">← Health</button></div>
    <div class='inner-card'>
      <h2>📊 Breath Rate Counter</h2>
      <p class='subtitle'>Press Start, then tap the big button each time you inhale for 60 seconds.</p>
      <div style='text-align:center;padding:20px 0'>
        <div style='display:flex;justify-content:center;gap:40px;margin-bottom:24px'>
          <div>
            <div style='font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase'>Breaths</div>
            <div id='brBreathsEl' style='font-family:Rajdhani,sans-serif;font-size:3.5rem;font-weight:700;color:var(--accent)'>0</div>
          </div>
          <div>
            <div style='font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase'>Time Left</div>
            <div id='brTimerEl' style='font-family:Rajdhani,sans-serif;font-size:3.5rem;font-weight:700;color:#a78bfa'>60</div>
          </div>
        </div>
        <button id='brTapBtn' onclick='brTap()' class='tap-btn-idle' style='
          width:150px;height:150px;border-radius:50%;
          background:linear-gradient(135deg,#f87171,#ef4444);
          border:3px solid transparent;
          cursor:pointer;font-size:1.1rem;
          transition:transform .1s, opacity .3s;
          color:#fff;font-weight:800;
          font-family:DM Sans,sans-serif;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
          margin:0 auto;
        ' onmousedown='this.style.transform="scale(.92)"' onmouseup='this.style.transform="scale(1)"' ontouchstart='this.style.transform="scale(.92)"' ontouchend='this.style.transform="scale(1)"'>
          <span style='font-size:2rem'>🌬️</span>
          <span>Inhale</span>
        </button>
        <div id='brHint' style='margin-top:10px;font-size:13px;color:var(--muted)'>Press Start first</div>
        <div style='display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap'>
          <button class='btn btn-primary' id='brStartBtn' onclick='brStart()'>▶ Start</button>
          <button class='btn btn-secondary' id='brPauseBtn' style='display:none' onclick='brPause()'>⏸ Pause</button>
          <button class='btn btn-primary' id='brResumeBtn' style='display:none;font-size:13px;padding:10px 16px' onclick='brResume()'>▶ Resume</button>
          <button class='btn btn-ghost' id='brResetBtn' onclick='brReset()'>↺ Reset</button>
        </div>
        <div id='brResult' style='margin-top:20px'></div>
      </div>
      <div class='result-box'>
        <p>Normal adult breathing rate: <strong style='color:#4ade80'>12–20 breaths/min</strong></p>
      </div>
    </div>
  </div>`;
}
function brActivateTap(){
  const tapBtn=document.getElementById('brTapBtn');
  if(tapBtn){tapBtn.classList.remove('tap-btn-idle');tapBtn.classList.add('tap-btn-active');tapBtn.style.opacity='1';tapBtn.style.borderColor='#f87171';}
}
function brDeactivateTap(){
  const tapBtn=document.getElementById('brTapBtn');
  if(tapBtn){tapBtn.classList.remove('tap-btn-active');tapBtn.classList.add('tap-btn-idle');}
}
function brRunTimer(){
  brTimer=setInterval(()=>{
    brSeconds--;
    const el=document.getElementById('brTimerEl');
    if(el) el.textContent=brSeconds;
    if(brSeconds<=0){
      clearInterval(brTimer); brRunning=false;
      brDeactivateTap();
      setHealthBtns('brStartBtn','brPauseBtn',null,null,'idle');
      document.getElementById('brResumeBtn').style.display='none';
      const hint=document.getElementById('brHint');
      if(hint) hint.textContent='Done!';
      let rating,color;
      if(brBreaths<12){rating='Below normal – try to relax';color='#f87171';}
      else if(brBreaths<=20){rating='Normal ✅';color='#4ade80';}
      else{rating='Above normal – try to slow down';color='#fbbf24';}
      const r=document.getElementById('brResult');
      if(r) r.innerHTML=`<div class='result-box' style='text-align:center'>
        <p>Your breathing rate</p>
        <strong style='font-size:2rem;color:${color}'>${brBreaths} breaths/min</strong>
        <div style='margin-top:8px;font-size:14px;color:${color};font-weight:600'>${rating}</div>
      </div>`;
    }
  },1000);
}
function brStart(){
  if(brRunning) return;
  brRunning=true; brPaused=false; brBreaths=0; brSeconds=60;
  document.getElementById('brBreathsEl').textContent='0';
  document.getElementById('brTimerEl').textContent='60';
  document.getElementById('brResult').innerHTML='';
  brActivateTap();
  const hint=document.getElementById('brHint');
  if(hint) hint.textContent='👆 Tap every time you inhale!';
  setHealthBtns('brStartBtn','brPauseBtn',null,null,'running');
  brRunTimer();
}
function brPause(){
  clearInterval(brTimer); brRunning=false; brPaused=true;
  brDeactivateTap();
  const pauseBtn=document.getElementById('brPauseBtn');
  const resumeBtn=document.getElementById('brResumeBtn');
  const startBtn=document.getElementById('brStartBtn');
  if(pauseBtn) pauseBtn.style.display='none';
  if(resumeBtn) resumeBtn.style.display='';
  if(startBtn){startBtn.className='btn btn-paused';startBtn.disabled=true;}
  const hint=document.getElementById('brHint');
  if(hint) hint.textContent='Paused — press Resume to continue';
}
function brResume(){
  brRunning=true; brPaused=false;
  brActivateTap();
  const pauseBtn=document.getElementById('brPauseBtn');
  const resumeBtn=document.getElementById('brResumeBtn');
  const startBtn=document.getElementById('brStartBtn');
  if(pauseBtn) pauseBtn.style.display='';
  if(resumeBtn) resumeBtn.style.display='none';
  if(startBtn){startBtn.className='btn btn-running';startBtn.disabled=true;}
  const hint=document.getElementById('brHint');
  if(hint) hint.textContent='👆 Tap every time you inhale!';
  brRunTimer();
}
function brTap(){
  if(!brRunning) return;
  brBreaths++;
  const el=document.getElementById('brBreathsEl');
  if(el) el.textContent=brBreaths;
}
function brReset(){
  clearInterval(brTimer);
  brRunning=false; brPaused=false; brBreaths=0; brSeconds=60;
  brDeactivateTap();
  setHealthBtns('brStartBtn','brPauseBtn',null,null,'idle');
  const resumeBtn=document.getElementById('brResumeBtn');
  if(resumeBtn) resumeBtn.style.display='none';
  const b=document.getElementById('brBreathsEl');
  const t=document.getElementById('brTimerEl');
  const r=document.getElementById('brResult');
  const hint=document.getElementById('brHint');
  if(b) b.textContent='0';
  if(t) t.textContent='60';
  if(r) r.innerHTML='';
  if(hint) hint.textContent='Press Start first';
}

/* ── HEART RATE MONITOR ── */
let hrTaps=[];
function renderHeartRate(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('health')">← Health</button></div>
    <div class='inner-card'>
      <h2>❤️ Heart Rate Monitor</h2>
      <p class='subtitle'>Tap the heart each time you feel your pulse. Uses last 10 taps for accuracy.</p>
      <div style='text-align:center;padding:20px 0'>
        <div id='hrDisplay' style='font-family:Rajdhani,sans-serif;font-size:5rem;font-weight:700;color:#f87171;line-height:1'>--</div>
        <div style='font-size:13px;color:var(--muted);margin-bottom:24px'>BPM (beats per minute)</div>
        <button onclick='hrTap()' id='hrTapBtn' style='
          width:150px;height:150px;border-radius:50%;
          background:linear-gradient(135deg,#f87171,#ef4444);
          border:none;cursor:pointer;font-size:2.5rem;
          box-shadow:0 0 30px rgba(248,113,113,0.5);
          transition:transform .1s;color:#fff;
          display:flex;align-items:center;justify-content:center;
          margin:0 auto;
          animation:tapPulse 1.2s ease-in-out infinite;
        ' onmousedown='this.style.transform="scale(.88)"' onmouseup='this.style.transform="scale(1)"' ontouchstart='this.style.transform="scale(.88)"' ontouchend='this.style.transform="scale(1)"'>
          ❤️
        </button>
        <div id='hrTapCount' style='margin-top:14px;font-size:13px;color:var(--muted)'>Just tap — no start needed</div>
        <button class='btn btn-ghost' style='margin-top:16px' onclick='hrReset()'>↺ Reset</button>
        <div id='hrZone' style='margin-top:20px'></div>
      </div>
      <div class='result-box'>
        <p><strong style='color:#4ade80'>Normal resting HR:</strong> 60–100 BPM &nbsp;|&nbsp; <strong style='color:#a78bfa'>Athletes:</strong> 40–60 BPM</p>
      </div>
    </div>
  </div>`;
}
function hrTap(){
  hrTaps.push(Date.now());
  if(hrTaps.length>10) hrTaps.shift();
  const el=document.getElementById('hrTapCount');
  if(el) el.textContent=`${hrTaps.length} tap${hrTaps.length===1?'':'s'} recorded — keep going!`;
  if(hrTaps.length>=2){
    const intervals=[];
    for(let i=1;i<hrTaps.length;i++) intervals.push(hrTaps[i]-hrTaps[i-1]);
    const avgInterval=intervals.reduce((a,b)=>a+b,0)/intervals.length;
    const bpm=Math.round(60000/avgInterval);
    const d=document.getElementById('hrDisplay');
    if(d) d.textContent=bpm;
    let zone,color;
    if(bpm<60){zone='Below normal';color='#60a5fa';}
    else if(bpm<=100){zone='Normal resting ✅';color='#4ade80';}
    else if(bpm<=140){zone='Moderate exercise';color='#fbbf24';}
    else{zone='High intensity';color='#f87171';}
    const z=document.getElementById('hrZone');
    if(z) z.innerHTML=`<div style='font-size:14px;color:${color};font-weight:600'>${zone}</div>`;
  }
}
function hrReset(){
  hrTaps=[];
  const d=document.getElementById('hrDisplay');
  const t=document.getElementById('hrTapCount');
  const z=document.getElementById('hrZone');
  if(d) d.textContent='--';
  if(t) t.textContent='Just tap — no start needed';
  if(z) z.innerHTML='';
}

/* ── HEART RATE ZONES ── */
function renderHeartZone(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('health')">← Health</button></div>
    <div class='inner-card'>
      <h2>🏃 Heart Rate Zones</h2>
      <p class='subtitle'>Find your personalised training zones based on age and max heart rate.</p>
      <label class='field-label'>Your Age</label>
      <input class='ks-input' id='hzAge' type='number' placeholder='e.g. 25' min='10' max='100'>
      <label class='field-label' style='margin-top:12px'>Max Heart Rate <span style='color:var(--sub);font-size:11px'>(leave blank to auto-calculate)</span></label>
      <input class='ks-input' id='hzMax' type='number' placeholder='Auto: 220 − Age'>
      <button class='btn btn-primary' style='margin-top:14px' onclick='calcHeartZones()'>💓 Calculate Zones</button>
      <div id='hzResult' style='margin-top:16px'></div>
    </div>
  </div>`;
}
function calcHeartZones(){
  const age=parseInt(document.getElementById('hzAge').value);
  if(!age||age<10||age>100){ksAlert('Enter a valid age between 10 and 100');return;}
  const maxHR=parseInt(document.getElementById('hzMax').value)||220-age;
  const zones=[
    {name:'Zone 1 — Warm Up',    pct:'50–60%', min:Math.round(maxHR*0.50), max:Math.round(maxHR*0.60), color:'#60a5fa', desc:'Light activity, recovery'},
    {name:'Zone 2 — Fat Burn',   pct:'60–70%', min:Math.round(maxHR*0.60), max:Math.round(maxHR*0.70), color:'#4ade80', desc:'Fat burning, endurance base'},
    {name:'Zone 3 — Aerobic',    pct:'70–80%', min:Math.round(maxHR*0.70), max:Math.round(maxHR*0.80), color:'#fbbf24', desc:'Cardiovascular fitness'},
    {name:'Zone 4 — Anaerobic',  pct:'80–90%', min:Math.round(maxHR*0.80), max:Math.round(maxHR*0.90), color:'#f97316', desc:'Speed & performance'},
    {name:'Zone 5 — Max Effort', pct:'90–100%',min:Math.round(maxHR*0.90), max:maxHR,                  color:'#f87171', desc:'Maximum intensity, short bursts'}
  ];
  const el=document.getElementById('hzResult');
  el.innerHTML=`
    <div style='font-size:13px;color:var(--muted);margin-bottom:12px'>Max HR: <strong style='color:var(--accent)'>${maxHR} BPM</strong> (Age: ${age})</div>
    ${zones.map(z=>`
    <div style='background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:14px'>
      <div style='width:4px;border-radius:4px;align-self:stretch;background:${z.color};flex-shrink:0'></div>
      <div style='flex:1'>
        <div style='font-weight:700;font-size:14px;color:${z.color}'>${z.name}</div>
        <div style='font-size:12px;color:var(--muted)'>${z.desc}</div>
      </div>
      <div style='text-align:right;flex-shrink:0'>
        <div style='font-family:Rajdhani,sans-serif;font-size:1.1rem;font-weight:700;color:var(--text)'>${z.min}–${z.max}</div>
        <div style='font-size:11px;color:var(--muted)'>${z.pct} BPM</div>
      </div>
    </div>`).join('')}`;
}
const STRESS_SCRIPT=[
  {phase:'Breathe In',dur:4,msg:'Inhale slowly through your nose',color:'#4ade80'},
  {phase:'Hold',dur:4,msg:'Hold gently — you are safe',color:'#a78bfa'},
  {phase:'Breathe Out',dur:6,msg:'Exhale slowly, release all tension',color:'#60a5fa'},
  {phase:'Pause',dur:2,msg:'You are calm. You are at peace.',color:'#fbbf24'},
];
let stressScriptIdx=0, stressSecondsLeft=0;
function renderStress(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('health')">← Health</button></div>
    <div class='inner-card'>
      <h2>🧘 Stress Relief Timer</h2>
      <p class='subtitle'>A guided session with breathing, pause and affirmation phases.</p>
      <div style='text-align:center;padding:20px 0'>
        <div id='stressCircle' style='
          width:160px;height:160px;border-radius:50%;
          background:radial-gradient(circle,#1a1a3a,#0a0c14);
          border:3px solid #a78bfa;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          margin:0 auto 16px;
          box-shadow:0 0 30px rgba(167,139,250,0.3);
          transition:border-color .5s, box-shadow .5s;
        '>
          <div id='stressPhase' style='font-family:Syne,sans-serif;font-weight:800;font-size:0.95rem;color:#a78bfa'>Ready</div>
          <div id='stressCount' style='font-family:Rajdhani,sans-serif;font-size:3rem;font-weight:700;color:#fff;line-height:1'>–</div>
        </div>
        <div id='stressMsg' style='font-size:14px;color:var(--muted);margin-bottom:16px;min-height:20px'>Take a comfortable seat and relax</div>
        <div style='display:flex;gap:10px;justify-content:center;flex-wrap:wrap'>
          <button class='btn btn-primary' id='stressStartBtn' onclick='startStress()'>🧘 Start Session</button>
          <button class='btn btn-secondary' id='stressPauseBtn' style='display:none' onclick='pauseStress()'>⏸ Pause</button>
          <button class='btn btn-primary' id='stressResumeBtn' style='display:none' onclick='resumeStress()'>▶ Resume</button>
          <button class='btn btn-ghost' id='stressResetBtn' onclick='resetStress()'>↺ Reset</button>
        </div>
      </div>
      <div class='result-box'>
        <p>This session combines breathing, pausing and gentle affirmations to reduce stress. Best done daily. 🌿</p>
      </div>
    </div>
  </div>`;
}
function startStress(){
  clearInterval(stressTimer);
  stressRunning=true; stressPaused=false; stressScriptIdx=0;
  setHealthBtns('stressStartBtn','stressPauseBtn','stressResumeBtn','stressResetBtn','running');
  runStressPhase();
}
function pauseStress(){
  clearInterval(stressTimer);
  stressPaused=true; stressRunning=false;
  setHealthBtns('stressStartBtn','stressPauseBtn','stressResumeBtn','stressResetBtn','paused');
  const phase=document.getElementById('stressPhase');
  if(phase) phase.textContent='Paused';
}
function resumeStress(){
  stressPaused=false; stressRunning=true;
  setHealthBtns('stressStartBtn','stressPauseBtn','stressResumeBtn','stressResetBtn','running');
  runStressPhase();
}
function resetStress(){
  clearInterval(stressTimer);
  stressRunning=false; stressPaused=false; stressScriptIdx=0;
  setHealthBtns('stressStartBtn','stressPauseBtn','stressResumeBtn','stressResetBtn','idle');
  const circle=document.getElementById('stressCircle');
  if(circle){circle.style.borderColor='#a78bfa';circle.style.boxShadow='0 0 30px rgba(167,139,250,0.3)';}
  const phase=document.getElementById('stressPhase');
  const count=document.getElementById('stressCount');
  const msg=document.getElementById('stressMsg');
  if(phase) phase.textContent='Ready';
  if(count) count.textContent='–';
  if(msg) msg.textContent='Take a comfortable seat and relax';
}
function runStressPhase(){
  if(!stressRunning) return;
  const p=STRESS_SCRIPT[stressScriptIdx];
  const circle=document.getElementById('stressCircle');
  const phase=document.getElementById('stressPhase');
  const count=document.getElementById('stressCount');
  const msg=document.getElementById('stressMsg');
  if(!circle) return;
  if(phase) phase.textContent=p.phase;
  if(msg) msg.textContent=p.msg;
  circle.style.borderColor=p.color;
  circle.style.boxShadow=`0 0 30px ${p.color}55`;
  stressSecondsLeft=p.dur;
  if(count) count.textContent=stressSecondsLeft+'s';
  stressTimer=setInterval(()=>{
    stressSecondsLeft--;
    if(count) count.textContent=stressSecondsLeft+'s';
    if(stressSecondsLeft<=0){
      clearInterval(stressTimer);
      stressScriptIdx=(stressScriptIdx+1)%STRESS_SCRIPT.length;
      runStressPhase();
    }
  },1000);
}
function renderEyeTimer(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('health')">← Health</button></div>
    <div class='inner-card'>
      <h2>👁️ 20-20-20 Eye Timer</h2>
      <p class='subtitle'>Every 20 minutes, look at something 20 feet away for 20 seconds. Reduces digital eye strain.</p>
      <div style='text-align:center;padding:20px 0'>
        <div id='eyeDisplay' style='font-family:Rajdhani,sans-serif;font-size:5rem;font-weight:700;color:var(--accent);line-height:1'>20:00</div>
        <div id='eyePhaseLabel' style='font-size:14px;color:var(--muted);margin:8px 0 24px'>20 min work session</div>
        <div style='display:flex;gap:10px;justify-content:center;flex-wrap:wrap'>
          <button class='btn btn-primary' id='eyeStartBtn' onclick='startEye()'>👁️ Start Timer</button>
          <button class='btn btn-secondary' id='eyePauseBtn' style='display:none' onclick='pauseEye()'>⏸ Pause</button>
          <button class='btn btn-primary' id='eyeResumeBtn' style='display:none' onclick='resumeEye()'>▶ Resume</button>
          <button class='btn btn-ghost' id='eyeResetBtn' onclick='resetEye()'>↺ Reset</button>
        </div>
        <div id='eyeMsg' style='margin-top:16px;font-size:14px;color:var(--muted);min-height:20px'></div>
      </div>
      <div class='result-box'>
        <p><strong style='color:var(--accent)'>The 20-20-20 Rule:</strong> For every 20 minutes of screen time, look at something 20 feet (6 meters) away for 20 seconds. This relaxes eye muscles and prevents strain.</p>
      </div>
    </div>
  </div>`;
}
function startEye(){
  if(eyeRunning) return;
  eyeRunning=true; eyePaused=false;
  eyePhase='work'; eyeSeconds=20*60;
  updateEyeDisplay();
  setHealthBtns('eyeStartBtn','eyePauseBtn','eyeResumeBtn','eyeResetBtn','running');
  runEyeTimer();
}
function pauseEye(){
  clearInterval(eyeTimer);
  eyeRunning=false; eyePaused=true;
  setHealthBtns('eyeStartBtn','eyePauseBtn','eyeResumeBtn','eyeResetBtn','paused');
}
function resumeEye(){
  eyeRunning=true; eyePaused=false;
  setHealthBtns('eyeStartBtn','eyePauseBtn','eyeResumeBtn','eyeResetBtn','running');
  runEyeTimer();
}
function runEyeTimer(){
  eyeTimer=setInterval(()=>{
    eyeSeconds--;
    updateEyeDisplay();
    if(eyeSeconds<=0){
      clearInterval(eyeTimer);
      if(eyePhase==='work'){
        eyePhase='rest'; eyeSeconds=20;
        const lbl=document.getElementById('eyePhaseLabel');
        const msg=document.getElementById('eyeMsg');
        const d=document.getElementById('eyeDisplay');
        if(lbl) lbl.textContent='👁️ REST — Look 20 feet away!';
        if(msg) msg.textContent='🔔 Time to rest your eyes!';
        if(d) d.style.color='#4ade80';
        runEyeTimer();
      } else {
        eyePhase='work'; eyeSeconds=20*60;
        const lbl=document.getElementById('eyePhaseLabel');
        const msg=document.getElementById('eyeMsg');
        const d=document.getElementById('eyeDisplay');
        if(lbl) lbl.textContent='20 min work session';
        if(msg) msg.textContent='✅ Great! Back to work.';
        if(d) d.style.color='var(--accent)';
        setTimeout(()=>{const m=document.getElementById('eyeMsg');if(m&&eyeRunning)m.textContent='';},3000);
        runEyeTimer();
      }
    }
  },1000);
}
function updateEyeDisplay(){
  const m=Math.floor(eyeSeconds/60), s=eyeSeconds%60;
  const d=document.getElementById('eyeDisplay');
  if(d) d.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function resetEye(){
  clearInterval(eyeTimer);
  eyeRunning=false; eyePaused=false;
  eyePhase='work'; eyeSeconds=20*60;
  setHealthBtns('eyeStartBtn','eyePauseBtn','eyeResumeBtn','eyeResetBtn','idle');
  const d=document.getElementById('eyeDisplay');
  const lbl=document.getElementById('eyePhaseLabel');
  const msg=document.getElementById('eyeMsg');
  if(d){d.textContent='20:00';d.style.color='var(--accent)';}
  if(lbl) lbl.textContent='20 min work session';
  if(msg) msg.textContent='';
}

/* ── WATER INTAKE TRACKER ── */
let waterGoal=8, waterCurrent=0;
function renderWater(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('health')">← Health</button></div>
    <div class='inner-card'>
      <h2>💧 Water Intake Tracker</h2>
      <p class='subtitle'>Track your daily hydration. Stay healthy — drink enough water!</p>
      <div style='display:flex;gap:10px;align-items:center;margin-bottom:20px'>
        <label class='field-label' style='margin:0;white-space:nowrap'>Daily Goal (glasses):</label>
        <input class='ks-input' id='waterGoalInput' type='number' value='8' min='1' max='20' style='max-width:80px' oninput='setWaterGoal(this.value)'>
      </div>
      <div style='text-align:center;padding:10px 0 20px'>
        <div id='waterProgressWrap' style='max-width:300px;margin:0 auto 16px'>
          <div style='display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px' id='waterGrid'></div>
        </div>
        <div style='font-family:Rajdhani,sans-serif;font-size:3rem;font-weight:700;color:#60a5fa;line-height:1'>
          <span id='waterCurrent'>0</span>/<span id='waterGoalDisplay'>8</span>
        </div>
        <div style='font-size:13px;color:var(--muted);margin-bottom:20px'>glasses today</div>
        <div style='display:flex;gap:10px;justify-content:center;flex-wrap:wrap'>
          <button class='btn btn-primary' onclick='addWater()'>💧 +1 Glass</button>
          <button class='btn btn-secondary' onclick='removeWater()'>− Remove Last</button>
          <button class='btn btn-ghost' onclick='resetWater()'>↺ Reset Day</button>
        </div>
        <div id='waterMsg' style='margin-top:16px;font-size:14px;min-height:20px;color:#4ade80'></div>
      </div>
      <div class='result-box'>
        <p>💡 Health experts recommend <strong style='color:#60a5fa'>8 glasses (2L)</strong> of water per day for average adults. Adjust based on your weight, activity and climate.</p>
      </div>
    </div>
  </div>`;
  renderWaterGrid();
}
function setWaterGoal(val){
  const v=parseInt(val);
  if(!v||v<1||v>20) return;
  waterGoal=v;
  if(waterCurrent>waterGoal) waterCurrent=waterGoal;
  const g=document.getElementById('waterGoalDisplay');
  if(g) g.textContent=waterGoal;
  renderWaterGrid();
}
function renderWaterGrid(){
  const grid=document.getElementById('waterGrid');
  if(!grid) return;
  grid.style.gridTemplateColumns=`repeat(${Math.min(waterGoal,4)},1fr)`;
  grid.innerHTML=Array.from({length:waterGoal},(_,i)=>`
    <div style='
      height:60px;border-radius:12px;border:2px solid ${i<waterCurrent?'#60a5fa':'var(--border)'};
      background:${i<waterCurrent?'rgba(96,165,250,0.2)':'var(--bg2)'};
      display:flex;align-items:center;justify-content:center;
      font-size:${i<waterCurrent?'1.4rem':'1rem'};
      transition:all .3s;
    '>${i<waterCurrent?'💧':'·'}</div>`).join('');
  const c=document.getElementById('waterCurrent');
  if(c) c.textContent=waterCurrent;
}
function addWater(){
  if(waterCurrent>=waterGoal){
    const msg=document.getElementById('waterMsg');
    if(msg){msg.textContent='🎉 Goal reached! Great job!';setTimeout(()=>msg.textContent='',3000);}
    return;
  }
  waterCurrent++;
  renderWaterGrid();
  if(waterCurrent===waterGoal){
    const msg=document.getElementById('waterMsg');
    if(msg) msg.textContent='🎉 Daily goal reached! Stay hydrated!';
  }
}
function removeWater(){
  if(waterCurrent>0){ waterCurrent--; renderWaterGrid(); }
}
function resetWater(){
  waterCurrent=0; renderWaterGrid();
  const msg=document.getElementById('waterMsg');
  if(msg) msg.textContent='';
}
