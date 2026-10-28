/* alio-games.js — Tic Tac Toe, 2048, Memory Match and Snake.
   Loaded automatically by index.html the first time someone opens one of these pages (with the Alio loading screen).
   Keep this file in the same folder as index.html. */
/* ── TIC TAC TOE ── */
let tttBoard, tttTurn, tttMode, tttScore={X:0,O:0,D:0}, tttDifficulty='medium';
function renderTTT(){
  if(!tttMode) tttMode='friend';
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('games')">← Games</button></div>
    <div class='inner-card'>
      <h2>⭕ Tic Tac Toe</h2>
      <div style='display:flex;gap:8px;margin-bottom:12px' id='tttModeBtns'>
        <button class='calc-tab ${tttMode==="friend"?"active":""}' onclick='setTTTMode("friend")'>👥 vs Friend</button>
        <button class='calc-tab ${tttMode==="ai"?"active":""}' onclick='setTTTMode("ai")'>🤖 vs AI</button>
      </div>
      <div id='tttDiffRow' style='display:${tttMode==="ai"?"flex":"none"};gap:8px;margin-bottom:12px'>
        <button class='calc-tab ${tttDifficulty==="easy"?"active":""}' onclick='setTTTDiff("easy")' style='font-size:12px'>😊 Easy</button>
        <button class='calc-tab ${tttDifficulty==="medium"?"active":""}' onclick='setTTTDiff("medium")' style='font-size:12px'>🤔 Medium</button>
        <button class='calc-tab ${tttDifficulty==="hard"?"active":""}' onclick='setTTTDiff("hard")' style='font-size:12px'>💀 Hard</button>
      </div>
      <div style='display:flex;justify-content:space-between;margin-bottom:14px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px'>
        <div style='text-align:center'><div style='font-size:1.2rem;font-family:Rajdhani,sans-serif;font-weight:700;color:#4ade80'>${tttScore.X}</div><div style='font-size:11px;color:var(--muted)'>X Wins</div></div>
        <div style='text-align:center'><div style='font-size:1.2rem;font-family:Rajdhani,sans-serif;font-weight:700;color:var(--muted)'>${tttScore.D}</div><div style='font-size:11px;color:var(--muted)'>Draws</div></div>
        <div style='text-align:center'><div style='font-size:1.2rem;font-family:Rajdhani,sans-serif;font-weight:700;color:#f87171'>${tttScore.O}</div><div style='font-size:11px;color:var(--muted)'>O Wins</div></div>
      </div>
      <div id='tttStatus' style='text-align:center;font-size:1rem;color:var(--muted);margin-bottom:12px'>X's turn</div>
      <div id='tttBoard' style='display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:300px;margin:0 auto'></div>
      <button class='btn btn-primary' style='margin-top:16px;width:100%' onclick='resetTTT()'>🔄 New Game</button>
    </div>
  </div>`;
  initTTT();
}
function setTTTMode(mode){
  tttMode=mode; tttScore={X:0,O:0,D:0};
  const diffRow=document.getElementById('tttDiffRow');
  if(diffRow) diffRow.style.display=mode==='ai'?'flex':'none';
  document.querySelectorAll('#tttModeBtns .calc-tab').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
  initTTT();
}
function setTTTDiff(diff){
  tttDifficulty=diff; tttScore={X:0,O:0,D:0};
  document.querySelectorAll('#tttDiffRow .calc-tab').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
  initTTT();
  const status=document.getElementById('tttStatus');
  if(status) status.textContent="X's turn";
}
function initTTT(){
  tttBoard=Array(9).fill('');tttTurn='X';
  renderTTTBoard();
}
function renderTTTBoard(winCells=[]){
  const el=document.getElementById('tttBoard');
  if(!el)return;
  el.innerHTML=tttBoard.map((cell,i)=>{
    const isWin=winCells.includes(i);
    const color=cell==='X'?'#4ade80':cell==='O'?'#f87171':'var(--muted)';
    return `<button onclick='tttClick(${i})' style='
      height:90px;border-radius:14px;border:2px solid ${isWin?'var(--accent)':'var(--border)'};
      background:${isWin?'rgba(245,166,35,0.15)':'var(--bg2)'};
      font-size:2rem;font-weight:800;color:${color};cursor:pointer;
      transition:transform .15s,background .2s;font-family:Syne,sans-serif;
    ' onmouseover='this.style.transform="scale(1.05)"' onmouseout='this.style.transform="scale(1)"'>${cell}</button>`;
  }).join('');
}
function tttClick(i){
  if(tttBoard[i]||tttCheckWin()) return;
  tttBoard[i]=tttTurn;
  const win=tttCheckWin();
  if(win){
    tttScore[tttTurn]++;
    if(tttMode==='ai'&&tttTurn==='X'&&typeof ksSubmit==='function'){ var tw={easy:1,medium:2,hard:3}[tttDifficulty]||1; ksSubmit('ttt',tttScore.X*tw,Math.min(300,tttScore.X*20*tw)); } // leaderboard: wins vs AI, harder AI counts more
    document.getElementById('tttStatus').innerHTML=`<span style='color:var(--accent);font-weight:700'>${tttTurn} wins! 🎉</span>`;
    renderTTTBoard(win);return;
  }
  if(tttBoard.every(c=>c)){
    tttScore.D++;
    document.getElementById('tttStatus').textContent="It's a draw! 🤝";
    renderTTTBoard();return;
  }
  tttTurn=tttTurn==='X'?'O':'X';
  document.getElementById('tttStatus').textContent=`${tttTurn}'s turn`;
  renderTTTBoard();
  if(tttMode==='ai'&&tttTurn==='O') setTimeout(tttAIMove,400);
}
function tttCheckWin(){
  const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(const [a,b,c] of lines) if(tttBoard[a]&&tttBoard[a]===tttBoard[b]&&tttBoard[a]===tttBoard[c]) return [a,b,c];
  return null;
}
function tttAIMove(){
  function checkWinBoard(b){
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(const [a,bc,c] of lines) if(b[a]&&b[a]===b[bc]&&b[a]===b[c]) return b[a];
    return null;
  }
  function minimax(board, isMax, depth){
    const win=checkWinBoard(board);
    if(win==='O') return 10-depth;
    if(win==='X') return depth-10;
    if(board.every(c=>c)) return 0;
    let best=isMax?-Infinity:Infinity;
    board.forEach((_,i)=>{
      if(!board[i]){
        board[i]=isMax?'O':'X';
        const score=minimax(board,!isMax,depth+1);
        board[i]='';
        best=isMax?Math.max(best,score):Math.min(best,score);
      }
    });
    return best;
  }

  const empty=tttBoard.map((v,i)=>v===''?i:-1).filter(i=>i>=0);

  // Easy: 70% random move
  if(tttDifficulty==='easy'){
    if(Math.random()<0.7){
      tttClick(empty[Math.floor(Math.random()*empty.length)]);return;
    }
  }

  // Medium: block wins, take wins, else random
  if(tttDifficulty==='medium'){
    // Check if AI can win
    for(const i of empty){
      tttBoard[i]='O';
      if(checkWinBoard(tttBoard)){tttBoard[i]='';tttClick(i);return;}
      tttBoard[i]='';
    }
    // Block player win
    for(const i of empty){
      tttBoard[i]='X';
      if(checkWinBoard(tttBoard)){tttBoard[i]='';tttClick(i);return;}
      tttBoard[i]='';
    }
    // Take center or random
    if(tttBoard[4]===''){tttClick(4);return;}
    tttClick(empty[Math.floor(Math.random()*empty.length)]);
    return;
  }

  // Hard: full minimax — unbeatable
  let best=-Infinity, move=empty[0];
  empty.forEach(i=>{
    tttBoard[i]='O';
    const score=minimax([...tttBoard],false,0);
    tttBoard[i]='';
    if(score>best){best=score;move=i;}
  });
  tttClick(move);
}
function resetTTT(){initTTT();document.getElementById('tttStatus').textContent="X's turn";}
function renderG2048(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('games')">← Games</button></div>
    <div class='inner-card'>
      <h2>🔢 2048</h2>
      <div id='g2048DiffRow' style='display:flex;gap:8px;margin-bottom:12px'>
        <button class='calc-tab ${g2048Diff==="easy"?"active":""}' onclick='set2048Diff("easy")' style='font-size:12px'>😊 Easy<br><span style='font-size:10px;opacity:.7'>4×4 slow</span></button>
        <button class='calc-tab ${g2048Diff==="medium"?"active":""}' onclick='set2048Diff("medium")' style='font-size:12px'>🤔 Medium<br><span style='font-size:10px;opacity:.7'>4×4 normal</span></button>
        <button class='calc-tab ${g2048Diff==="hard"?"active":""}' onclick='set2048Diff("hard")' style='font-size:12px'>💀 Hard<br><span style='font-size:10px;opacity:.7'>5×5 fast</span></button>
      </div>
      <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:14px'>
        <div style='display:flex;gap:10px'>
          <div style='background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px 16px;text-align:center'>
            <div style='font-size:11px;color:var(--muted)'>SCORE</div>
            <div id='g2048Score' style='font-family:Rajdhani,sans-serif;font-size:1.3rem;font-weight:700;color:var(--accent)'>0</div>
          </div>
          <div style='background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px 16px;text-align:center'>
            <div style='font-size:11px;color:var(--muted)'>BEST</div>
            <div id='g2048Best' style='font-family:Rajdhani,sans-serif;font-size:1.3rem;font-weight:700;color:#a78bfa'>0</div>
          </div>
        </div>
        <button class='btn btn-primary' style='padding:10px 18px' onclick='init2048()'>New</button>
      </div>
      <div id='g2048Grid' style='display:grid;grid-template-columns:repeat(${g2048Diff==="hard"?5:4},1fr);gap:8px;background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:12px;touch-action:none'></div>
      <div id='g2048Msg' style='text-align:center;margin-top:12px;font-size:1.1rem;font-weight:700;min-height:28px'></div>
      <p style='font-size:12px;color:var(--muted);text-align:center;margin-top:8px'>Swipe or use arrow keys to slide tiles</p>
    </div>
  </div>`;
  init2048();
  setup2048Touch();
  setup2048Keys();
}
const TILE_COLORS={2:'#3d2a1e',4:'#4a2e1a',8:'#7c3a1a',16:'#8b2e0a',32:'#9b2200',64:'#a31500',128:'#7c4a00',256:'#8b5a00',512:'#6b4c00',1024:'#4a3d00',2048:'#2a3300'};
function set2048Diff(diff){
  g2048Diff=diff; g2048Best=0;
  document.querySelectorAll('#g2048DiffRow .calc-tab').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
  const grid=document.getElementById('g2048Grid');
  if(grid){const cols=diff==='hard'?5:4;grid.style.gridTemplateColumns=`repeat(${cols},1fr)`;}
  init2048();
}
function get2048Size(){return g2048Diff==='hard'?25:16;}
function get2048Cols(){return g2048Diff==='hard'?5:4;}
function init2048(){
  const size=get2048Size();
  g2048Board=Array(size).fill(0);g2048Score=0;g2048Over=false;
  add2048Tile();add2048Tile();
  const grid=document.getElementById('g2048Grid');
  if(grid) grid.style.gridTemplateColumns=`repeat(${get2048Cols()},1fr)`;
  render2048();
}
function add2048Tile(){
  const empty=g2048Board.map((v,i)=>v===0?i:-1).filter(i=>i>=0);
  if(!empty.length)return;
  const idx=empty[Math.floor(Math.random()*empty.length)];
  g2048Board[idx]=Math.random()<0.9?2:4;
}
function render2048(){
  const grid=document.getElementById('g2048Grid');
  if(!grid)return;
  grid.innerHTML=g2048Board.map(v=>`
    <div style='
      height:${g2048Diff==="hard"?52:64}px;border-radius:10px;display:flex;align-items:center;justify-content:center;
      background:${v?TILE_COLORS[v]||'#1a0a00':'#161c2a'};
      border:1px solid ${v?'rgba(245,166,35,0.3)':'var(--border)'};
      font-family:Rajdhani,sans-serif;font-size:${v>=1000?'1.1rem':v>=100?'1.3rem':'1.5rem'};
      font-weight:700;color:${v?'#f5a623':'#2a334a'};
      transition:all .1s;
    '>${v||''}</div>`).join('');
  const scoreEl=document.getElementById('g2048Score');
  const bestEl=document.getElementById('g2048Best');
  if(scoreEl) scoreEl.textContent=g2048Score;
  if(g2048Score>g2048Best) g2048Best=g2048Score;
  if(bestEl) bestEl.textContent=g2048Best;
  const msg=document.getElementById('g2048Msg');
  if(msg) msg.innerHTML=g2048Over?`<span style='color:#f87171'>Game Over! 😢</span>`:g2048Board.includes(2048)?`<span style='color:#4ade80'>You reached 2048! 🎉</span>`:'';
}
function slide2048(row,size=4){
  let r=row.filter(v=>v);
  for(let i=0;i<r.length-1;i++) if(r[i]===r[i+1]){r[i]*=2;g2048Score+=r[i];r.splice(i+1,1);i++;}
  while(r.length<size) r.push(0);
  return r;
}
function move2048(dir){
  if(g2048Over)return;
  const cols=get2048Cols(), rows=get2048Size()/cols;
  let b=[...g2048Board], changed=false;
  for(let i=0;i<(dir==='left'||dir==='right'?rows:cols);i++){
    let row=[];
    if(dir==='left') row=b.slice(i*cols,i*cols+cols);
    else if(dir==='right') row=b.slice(i*cols,i*cols+cols).reverse();
    else if(dir==='up'){for(let k=0;k<rows;k++) row.push(b[i+k*cols]);}
    else{for(let k=rows-1;k>=0;k--) row.push(b[i+k*cols]);}
    const slid=slide2048(row,dir==='left'||dir==='right'?cols:rows);
    if(dir==='right') slid.reverse();
    for(let j=0;j<slid.length;j++){
      let idx;
      if(dir==='left') idx=i*cols+j;
      else if(dir==='right') idx=i*cols+j;
      else if(dir==='up') idx=i+j*cols;
      else idx=i+(rows-1-j)*cols;
      if(b[idx]!==slid[j]){changed=true;b[idx]=slid[j];}
    }
  }
  if(changed){g2048Board=b;add2048Tile();
    if(!canMove2048()) g2048Over=true;
    render2048();
  }
}
function canMove2048(){
  const cols=get2048Cols(),rows=get2048Size()/cols;
  if(g2048Board.includes(0))return true;
  for(let i=0;i<rows;i++) for(let j=0;j<cols;j++){
    const idx=i*cols+j;
    if(j<cols-1&&g2048Board[idx]===g2048Board[idx+1])return true;
    if(i<rows-1&&g2048Board[idx]===g2048Board[idx+cols])return true;
  }
  return false;
}
function setup2048Keys(){
  document.onkeydown=e=>{
    const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
    if(map[e.key]){e.preventDefault();move2048(map[e.key]);}
  };
}
function setup2048Touch(){
  let sx,sy;
  const el=document.getElementById('g2048Grid');
  if(!el)return;
  el.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
  el.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
    if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;
    if(Math.abs(dx)>Math.abs(dy)) move2048(dx>0?'right':'left');
    else move2048(dy>0?'down':'up');
  },{passive:true});
}

/* ── MEMORY CARDS ── */
const MEMORY_EMOJIS=['🎯','🎲','🎸','🎺','🎻','🎹','🎨','🎭','🏆','🎪','🚀','🌟','🦁','🐯','🦊','🦋'];
function renderMemory(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('games')">← Games</button></div>
    <div class='inner-card'>
      <h2>🃏 Memory Cards</h2>
      <div id='memDiffRow' style='display:flex;gap:8px;margin-bottom:12px'>
        <button class='calc-tab ${memDiff==="easy"?"active":""}' onclick='setMemDiff("easy")' style='font-size:12px'>😊 Easy<br><span style='font-size:10px;opacity:.7'>4 pairs</span></button>
        <button class='calc-tab ${memDiff==="medium"?"active":""}' onclick='setMemDiff("medium")' style='font-size:12px'>🤔 Medium<br><span style='font-size:10px;opacity:.7'>8 pairs</span></button>
        <button class='calc-tab ${memDiff==="hard"?"active":""}' onclick='setMemDiff("hard")' style='font-size:12px'>💀 Hard<br><span style='font-size:10px;opacity:.7'>16 pairs</span></button>
      </div>
      <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:14px'>
        <div style='display:flex;gap:10px'>
          <div style='background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px 14px;text-align:center'>
            <div style='font-size:11px;color:var(--muted)'>MOVES</div>
            <div id='memMoves' style='font-family:Rajdhani,sans-serif;font-size:1.2rem;font-weight:700;color:var(--accent)'>0</div>
          </div>
          <div style='background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px 14px;text-align:center'>
            <div style='font-size:11px;color:var(--muted)'>TIME</div>
            <div id='memTime' style='font-family:Rajdhani,sans-serif;font-size:1.2rem;font-weight:700;color:#a78bfa'>0s</div>
          </div>
        </div>
        <button class='btn btn-primary' style='padding:10px 18px' onclick='initMemory()'>New</button>
      </div>
      <div id='memGrid' style='display:grid;grid-template-columns:repeat(4,1fr);gap:8px'></div>
      <div id='memWin' style='text-align:center;margin-top:14px;min-height:24px'></div>
    </div>
  </div>`;
  initMemory();
}
function setMemDiff(diff){
  memDiff=diff;
  document.querySelectorAll('#memDiffRow .calc-tab').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
  initMemory();
}
function getMemPairs(){return memDiff==='easy'?4:memDiff==='hard'?16:8;}
function getMemCols(){return memDiff==='hard'?8:4;}
function initMemory(){
  clearInterval(memTimer);
  const pairCount=getMemPairs();
  // For hard mode (16 pairs), use extended emoji set
  const allEmojis=[...MEMORY_EMOJIS,'🌈','🌊','🔥','⚡','🌙','☀️','🎃','🏄','🎯','🦄','🌺','🍕','🎸','🏆','💎','🚂'];
  const pairs=allEmojis.slice(0,pairCount);
  memCards=[...pairs,...pairs].sort(()=>Math.random()-.5).map((e,i)=>({id:i,emoji:e,flipped:false,matched:false}));
  memFlipped=[];memMatched=0;memLock=false;memMoves=0;memTime=0;
  memTimer=setInterval(()=>{
    memTime++;
    const el=document.getElementById('memTime');
    if(el) el.textContent=memTime+'s';
  },1000);
  renderMemGrid();
}
function renderMemGrid(){
  const grid=document.getElementById('memGrid');
  if(!grid)return;
  grid.style.gridTemplateColumns=`repeat(${getMemCols()},1fr)`;
  grid.innerHTML=memCards.map(c=>`
    <div onclick='flipCard(${c.id})' style='
      height:${memDiff==='hard'?50:70}px;border-radius:12px;display:flex;align-items:center;justify-content:center;
      font-size:${c.flipped||c.matched?(memDiff==='hard'?'1.3rem':'1.8rem'):'1rem'};
      background:${c.matched?'rgba(74,222,128,0.1)':c.flipped?'var(--surface2)':'var(--bg2)'};
      color:var(--text);
      border:2px solid ${c.matched?'#4ade80':c.flipped?'var(--accent)':'var(--border)'};
      cursor:${c.matched?'default':'pointer'};transition:all .25s;
    '>${c.flipped||c.matched?c.emoji:'?'}</div>`).join('');
  const mv=document.getElementById('memMoves');
  if(mv) mv.textContent=memMoves;
}
function flipCard(id){
  if(memLock) return;
  const card=memCards.find(c=>c.id===id);
  if(!card||card.flipped||card.matched)return;
  card.flipped=true;memFlipped.push(card);
  renderMemGrid();
  if(memFlipped.length===2){
    memMoves++;memLock=true;
    if(memFlipped[0].emoji===memFlipped[1].emoji){
      memFlipped.forEach(c=>c.matched=true);
      memMatched+=2;memFlipped=[];memLock=false;
      renderMemGrid();
      if(memMatched===memCards.length){
        clearInterval(memTimer);
        const win=document.getElementById('memWin');
        if(win) win.innerHTML=`<span style='color:#4ade80;font-weight:700;font-size:1.1rem'>🎉 Completed in ${memMoves} moves & ${memTime}s!</span>`;
      }
    } else {
      setTimeout(()=>{memFlipped.forEach(c=>c.flipped=false);memFlipped=[];memLock=false;renderMemGrid();},900);
    }
  }
}
function renderSnake(){
  appEl.innerHTML=`<div class='page-wrap'>
    <div class='back-row'><button class='back-btn' onclick="go('games')">← Games</button></div>
    <div class='inner-card'>
      <h2>🐍 Snake</h2>
      <style>
        @media(min-width:761px){
          .snake-layout{display:grid;grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr);gap:28px;align-items:start;max-width:880px;margin:0 auto}
          .snake-left #snakeDiffRow{flex-direction:column}
          .snake-left .snake-stats{flex-direction:column;align-items:stretch!important;gap:12px}
          .snake-left .snake-stats .btn{width:100%}
          .snake-main #snakeCanvas{width:min(440px,calc(100vh - 240px))!important;max-width:none!important;min-width:280px}
          .snake-right{display:flex;flex-direction:column;align-items:center;align-self:center}
          .snake-right .snake-pad{margin-top:0!important}
        }
      </style>
      <div class='snake-layout'>
      <div class='snake-left'>
      <div id='snakeDiffRow' style='display:flex;gap:8px;margin-bottom:12px'>
        <button class='calc-tab ${snakeDiff==="easy"?"active":""}' onclick='setSnakeDiff("easy")' style='font-size:12px'>😊 Easy<br><span style='font-size:10px;opacity:.7'>slow</span></button>
        <button class='calc-tab ${snakeDiff==="medium"?"active":""}' onclick='setSnakeDiff("medium")' style='font-size:12px'>🤔 Medium<br><span style='font-size:10px;opacity:.7'>normal</span></button>
        <button class='calc-tab ${snakeDiff==="hard"?"active":""}' onclick='setSnakeDiff("hard")' style='font-size:12px'>💀 Hard<br><span style='font-size:10px;opacity:.7'>fast!</span></button>
      </div>
      <div class='snake-stats' style='display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'>
        <div style='display:flex;gap:10px'>
          <div style='background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px 14px;text-align:center'>
            <div style='font-size:11px;color:var(--muted)'>SCORE</div>
            <div id='snakeScore' style='font-family:Rajdhani,sans-serif;font-size:1.2rem;font-weight:700;color:var(--accent)'>0</div>
          </div>
          <div style='background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px 14px;text-align:center'>
            <div style='font-size:11px;color:var(--muted)'>BEST</div>
            <div id='snakeBest' style='font-family:Rajdhani,sans-serif;font-size:1.2rem;font-weight:700;color:#a78bfa'>0</div>
          </div>
        </div>
        <button id='snakeMainBtn' class='btn btn-primary' style='padding:10px 18px' onclick='snakeMainBtn()'>▶ Start</button>
      </div>
      </div>
      <div class='snake-main'>
      <canvas id='snakeCanvas' style='display:block;border-radius:14px;border:1px solid var(--border);background:var(--bg2);width:100%;max-width:360px;margin:0 auto;touch-action:none'></canvas>
      <div id='snakeMsg' style='text-align:center;margin-top:10px;min-height:24px'></div>
      </div>
      <div class='snake-right'>
      <div class='snake-pad' style='display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;max-width:200px;margin:14px auto 0'>
        <div></div>
        <button onclick="snakeBtn('up')" style='padding:14px;border-radius:12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:1.2rem;cursor:pointer'>▲</button>
        <div></div>
        <button onclick="snakeBtn('left')" style='padding:14px;border-radius:12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:1.2rem;cursor:pointer'>◀</button>
        <button onclick="snakeBtn('down')" style='padding:14px;border-radius:12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:1.2rem;cursor:pointer'>▼</button>
        <button onclick="snakeBtn('right')" style='padding:14px;border-radius:12px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:1.2rem;cursor:pointer'>▶</button>
      </div>
      <p style='font-size:12px;color:var(--muted);text-align:center;margin-top:8px'>Keyboard: arrow keys · No keyboard: use the pad</p>
      </div>
      </div>
    </div>
  </div>`;
  initSnake();
  setupSnakeKeys();
  setupSnakeTouch();
}
const SNAKE_COLS=18, SNAKE_ROWS=18, SNAKE_SIZE=20;
function setSnakeDiff(diff){
  snakeDiff=diff; snakeBest=0;
  document.querySelectorAll('#snakeDiffRow .calc-tab').forEach(b=>b.classList.remove('active'));
  event.target.classList.add('active');
  initSnake();
}
function getSnakeStartSpeed(){return snakeDiff==='easy'?220:snakeDiff==='hard'?90:150;}
/* Snake never starts by itself: the board waits (idle) until the player presses Start. */
let snakeIdle=true, snakeOver=false;
function snakeSyncBtn(){
  const b=document.getElementById('snakeMainBtn'); if(!b) return;
  b.textContent = snakeIdle ? '▶ Start' : (snakeOver ? '▶ Play again' : '↻ Restart');
}
function initSnake(){
  clearInterval(snakeLoop);
  snakeBody=[{x:9,y:9},{x:8,y:9},{x:7,y:9}];
  snakeDir={x:1,y:0};snakeScore=0;snakeRunning=false;snakeIdle=true;snakeOver=false;snakeSpeed=getSnakeStartSpeed();
  placeSnakeFood();
  const canvas=document.getElementById('snakeCanvas');
  if(canvas){canvas.width=SNAKE_COLS*SNAKE_SIZE;canvas.height=SNAKE_ROWS*SNAKE_SIZE;}
  const sc=document.getElementById('snakeScore'); if(sc) sc.textContent='0';
  const b=document.getElementById('snakeBest'); if(b) b.textContent=snakeBest;
  drawSnake();
  const msg=document.getElementById('snakeMsg');
  if(msg) msg.innerHTML="<span style='color:var(--muted);font-weight:600'>Press ▶ Start when you are ready</span>";
  snakeSyncBtn();
}
function snakeStart(){
  if(snakeOver) initSnake();
  clearInterval(snakeLoop);
  snakeIdle=false; snakeOver=false; snakeRunning=true;
  const msg=document.getElementById('snakeMsg'); if(msg) msg.innerHTML='';
  drawSnake();
  snakeLoop=setInterval(stepSnake,snakeSpeed);
  snakeSyncBtn();
}
function snakeMainBtn(){
  if(snakeIdle||snakeOver) snakeStart();   // begin / play again
  else initSnake();                        // restart: back to the waiting board, Start begins again
}
function placeSnakeFood(){
  do{snakeFood={x:Math.floor(Math.random()*SNAKE_COLS),y:Math.floor(Math.random()*SNAKE_ROWS)};}
  while(snakeBody.some(s=>s.x===snakeFood.x&&s.y===snakeFood.y));
}
function stepSnake(){
  if(!snakeRunning)return;
  const head={x:snakeBody[0].x+snakeDir.x,y:snakeBody[0].y+snakeDir.y};
  if(head.x<0||head.x>=SNAKE_COLS||head.y<0||head.y>=SNAKE_ROWS||snakeBody.some(s=>s.x===head.x&&s.y===head.y)){
    snakeRunning=false;snakeOver=true;clearInterval(snakeLoop);snakeSyncBtn();
    if(snakeScore>snakeBest){snakeBest=snakeScore;const b=document.getElementById('snakeBest');if(b)b.textContent=snakeBest;}
    const msg=document.getElementById('snakeMsg');
    if(msg) msg.innerHTML=`<span style='color:#f87171;font-weight:700'>Game Over! Score: ${snakeScore} 💀</span>`;
    return;
  }
  snakeBody.unshift(head);
  if(head.x===snakeFood.x&&head.y===snakeFood.y){
    snakeScore++;
    const sc=document.getElementById('snakeScore');if(sc)sc.textContent=snakeScore;
    if(snakeScore>snakeBest){snakeBest=snakeScore;const b=document.getElementById('snakeBest');if(b)b.textContent=snakeBest;}
    placeSnakeFood();
    if(snakeScore%5===0){clearInterval(snakeLoop);const minSpeed=snakeDiff==='easy'?120:snakeDiff==='hard'?40:60;snakeSpeed=Math.max(minSpeed,snakeSpeed-15);snakeLoop=setInterval(stepSnake,snakeSpeed);}
  } else snakeBody.pop();
  drawSnake();
}
function drawSnake(){
  const canvas=document.getElementById('snakeCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // Draw grid dots
  ctx.fillStyle='#161c2a';
  for(let x=0;x<SNAKE_COLS;x++) for(let y=0;y<SNAKE_ROWS;y++){
    ctx.beginPath();ctx.arc(x*SNAKE_SIZE+SNAKE_SIZE/2,y*SNAKE_SIZE+SNAKE_SIZE/2,1,0,Math.PI*2);ctx.fill();
  }
  // Draw food
  ctx.fillStyle='#f5a623';
  ctx.shadowColor='#f5a623';ctx.shadowBlur=12;
  ctx.beginPath();ctx.arc(snakeFood.x*SNAKE_SIZE+SNAKE_SIZE/2,snakeFood.y*SNAKE_SIZE+SNAKE_SIZE/2,SNAKE_SIZE/2-2,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  // Draw snake
  snakeBody.forEach((seg,i)=>{
    const ratio=1-i/snakeBody.length;
    ctx.fillStyle=`hsl(${140+i*2},${70-i}%,${45+ratio*15}%)`;
    ctx.shadowColor=i===0?'#4ade80':'transparent';ctx.shadowBlur=i===0?10:0;
    const pad=i===0?1:2;
    const rx=seg.x*SNAKE_SIZE+pad, ry=seg.y*SNAKE_SIZE+pad, rw=SNAKE_SIZE-pad*2, rh=SNAKE_SIZE-pad*2, rr=4;
    ctx.beginPath();ctx.moveTo(rx+rr,ry);ctx.lineTo(rx+rw-rr,ry);ctx.arcTo(rx+rw,ry,rx+rw,ry+rr,rr);ctx.lineTo(rx+rw,ry+rh-rr);ctx.arcTo(rx+rw,ry+rh,rx+rw-rr,ry+rh,rr);ctx.lineTo(rx+rr,ry+rh);ctx.arcTo(rx,ry+rh,rx,ry+rh-rr,rr);ctx.lineTo(rx,ry+rr);ctx.arcTo(rx,ry,rx+rr,ry,rr);ctx.closePath();
    ctx.fill();
  });
  ctx.shadowBlur=0;
  if(snakeIdle){
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font="700 26px 'DM Sans',sans-serif";ctx.fillText('Press Start',canvas.width/2,canvas.height/2);
    ctx.textAlign='start';ctx.textBaseline='alphabetic';
  }
}
function setupSnakeKeys(){
  document.onkeydown=e=>{
    const map={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
    if(map[e.key]){
      e.preventDefault();
      const d=map[e.key];
      if(!snakeRunning) return;
      if(d.x!==-snakeDir.x||d.y!==-snakeDir.y) snakeDir=d;
    }
  };
}
function snakeBtn(dir){
  const map={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  const d=map[dir];
  if(!snakeRunning) return;
  if(d.x!==-snakeDir.x||d.y!==-snakeDir.y) snakeDir=d;
}
function setupSnakeTouch(){
  let sx,sy;
  const canvas=document.getElementById('snakeCanvas');
  if(!canvas)return;
  canvas.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
  canvas.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
    if(Math.max(Math.abs(dx),Math.abs(dy))<15)return;
    if(Math.abs(dx)>Math.abs(dy)) snakeBtn(dx>0?'right':'left');
    else snakeBtn(dy>0?'down':'up');
  },{passive:true});
}
