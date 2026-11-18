const kana='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split('');
const romaji='a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n'.split(' ');
const hangul='아 이 우 에 오 카 키 쿠 케 코 사 시 스 세 소 타 치 츠 테 토 나 니 누 네 노 하 히 후 헤 호 마 미 무 메 모 야 유 요 라 리 루 레 로 와 오 응'.split(' ');
const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
let idx=read('jm_index',0),learned=new Set(read('jm_learned',[])),stats=read('jm_stats',{right:0,total:0});
if(!Number.isInteger(idx)||idx<0||idx>=46)idx=0;
function save(){localStorage.setItem('jm_index',JSON.stringify(idx));localStorage.setItem('jm_learned',JSON.stringify([...learned]));localStorage.setItem('jm_stats',JSON.stringify(stats))}
const canvas=$('ink'),ctx=canvas.getContext('2d');let drawing=false,last=null;
function resize(){const r=canvas.getBoundingClientRect(),d=window.devicePixelRatio||1;canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#1d4ed8'}
function clear(){ctx.clearRect(0,0,canvas.width,canvas.height)}
function show(){$('character').textContent=kana[idx];$('guide').textContent=kana[idx];$('reading').textContent=romaji[idx]+' · '+hangul[idx];$('counter').textContent=(idx+1)+' / 46';$('known').textContent=learned.has(idx)?'✓ 학습 완료':'✓ 익혔어요';clear();renderStrokeOrder();save()}
function speak(){if(!('speechSynthesis' in window)){alert('이 브라우저는 음성 합성을 지원하지 않습니다.');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(kana[idx]);u.lang='ja-JP';u.rate=.75;const v=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith('ja'));if(v)u.voice=v;speechSynthesis.speak(u)}
$('speak').onclick=speak;$('prev').onclick=()=>{idx=(idx+45)%46;show()};$('next').onclick=()=>{idx=(idx+1)%46;show()};$('known').onclick=()=>{learned.has(idx)?learned.delete(idx):learned.add(idx);show()};
const pos=e=>{const r=canvas.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);drawing=true;last=pos(e);ctx.beginPath();ctx.arc(last[0],last[1],2.5,0,Math.PI*2);ctx.fillStyle='#1d4ed8';ctx.fill()});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=pos(e);ctx.beginPath();ctx.moveTo(...last);ctx.lineTo(...p);ctx.lineWidth=e.pointerType==='pen'?Math.max(2,Math.min(7,(e.pressure||.5)*7)):5;ctx.stroke();last=p});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>drawing=false);
$('clear').onclick=clear;$('toggleGuide').onclick=()=>{const g=$('guide');g.hidden=!g.hidden;$('toggleGuide').textContent=g.hidden?'가이드 보이기':'가이드 숨기기'};
let answer=0,locked=false;function score(){$('quizScore').textContent='누적 정답 '+stats.right+' / '+stats.total}
function quiz(){locked=false;answer=Math.floor(Math.random()*46);$('question').textContent='“'+romaji[answer]+'”에 해당하는 히라가나는?';$('feedback').textContent='';const opts=new Set([answer]);while(opts.size<4)opts.add(Math.floor(Math.random()*46));const arr=[...opts];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}$('choices').replaceChildren();for(const n of arr){const b=document.createElement('button');b.textContent=kana[n];b.onclick=()=>{if(locked)return;locked=true;stats.total++;if(n===answer){stats.right++;learned.add(answer);$('feedback').textContent='정답! 잘했어요.'}else $('feedback').textContent='정답은 '+kana[answer]+' ('+romaji[answer]+') 입니다.';save();score()};$('choices').append(b)}}$('newQuiz').onclick=quiz;
function review(){$('progressText').textContent='학습 완료 '+learned.size+' / 46자';$('progressFill').style.width=learned.size/46*100+'%';$('grid').replaceChildren();kana.forEach((c,i)=>{const b=document.createElement('button');b.className='tile'+(learned.has(i)?' done':'');b.textContent=c;b.title=romaji[i];b.onclick=()=>{idx=i;tab('learn');show()};$('grid').append(b)})}
function tab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));for(const id of ['learn','quiz','review'])$(id).hidden=id!==name;if(name==='quiz'){quiz();score()}if(name==='review')review();if(name==='learn')setTimeout(resize,0)}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,learned:[...learned],stats,idx},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='japanese-master-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('import').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{try{const f=e.target.files?.[0];if(!f)return;const d=JSON.parse(await f.text());if(d.version!==1||!Array.isArray(d.learned)||!d.learned.every(n=>Number.isInteger(n)&&n>=0&&n<46))throw Error();learned=new Set(d.learned);stats={right:Math.max(0,Number(d.stats?.right)||0),total:Math.max(0,Number(d.stats?.total)||0)};idx=Number.isInteger(d.idx)&&d.idx>=0&&d.idx<46?d.idx:0;save();review();alert('진도를 불러왔습니다.')}catch{alert('올바른 진도 파일이 아닙니다.')}};window.addEventListener('resize',()=>{if(!$('learn').hidden)resize()});resize();if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});

let deferredInstall=null;
const installInfo=$('installInfo');
function isInstalled(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;installInfo.textContent='앱 설치 준비가 완료되었습니다.'});
window.addEventListener('appinstalled',()=>{deferredInstall=null;installInfo.textContent='설치 완료! 홈 화면에서 일본어 마스터를 실행하세요.'});
$('installApp').onclick=async()=>{
 if(isInstalled()){installInfo.textContent='이미 앱으로 실행 중입니다.';return}
 if(deferredInstall){const p=deferredInstall;deferredInstall=null;p.prompt();const result=await p.userChoice;installInfo.textContent=result.outcome==='accepted'?'설치가 진행됩니다.':'설치를 취소했습니다.';return}
 const chrome=/CriOS|Chrome\//.test(navigator.userAgent)&&!/EdgA|OPR\//.test(navigator.userAgent);
 installInfo.textContent=chrome?'Chrome 메뉴(⋮) → 홈 화면에 추가 → 설치를 선택하세요. 설치 메뉴가 보이지 않으면 Chrome을 업데이트한 뒤 다시 시도하세요.':'설치는 Chrome 브라우저를 권장합니다. Chrome이 없다면 Play 스토어에서 설치한 뒤, Chrome 주소창에 이 페이지 주소를 입력하고 메뉴(⋮) → 홈 화면에 추가 → 설치를 선택하세요.';
};
$('removeApp').onclick=()=>{
 const msg='앱 삭제 방법: 갤럭시탭 홈 화면에서 일본어 마스터 아이콘을 길게 누른 뒤 [설치 삭제]를 선택하세요. 또는 설정 → 애플리케이션 → 일본어 마스터 → 삭제. 웹페이지는 보안상 앱을 직접 삭제할 수 없습니다. 학습 기록은 삭제될 수 있으니 복습·진도에서 먼저 백업하세요.';
 installInfo.textContent=msg;alert(msg);
};

const aStrokeSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" aria-label="あ 세 획 쓰는 순서">
<defs><marker id="arrowB" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="none" stroke="#60a5fa" stroke-width="1.2"/></marker><marker id="arrowG" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="none" stroke="#34c99a" stroke-width="1.2"/></marker><marker id="arrowR" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="none" stroke="#e98c95" stroke-width="1.2"/></marker></defs>
<path d="M200 0V400 M0 200H400" stroke="#67c9ed" stroke-width="2.5" stroke-dasharray="12 7" fill="none"/>
<path d="M85 122 Q157 125 258 101" stroke="#7cbcf6" stroke-width="20" stroke-linecap="round" fill="none"/>
<path d="M165 55 Q151 145 159 243 Q160 300 173 321" stroke="#53cfa9" stroke-width="21" stroke-linecap="round" fill="none"/>
<path d="M230 159 Q256 192 224 248 Q181 312 108 325 Q72 327 70 282 Q69 246 107 216 Q158 177 230 174 Q293 171 321 210 Q359 269 313 320 Q281 354 229 364" stroke="#ee949a" stroke-width="21" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<g font-family="system-ui,sans-serif" font-size="27" font-weight="600"><text x="43" y="120" fill="#60a5fa">1</text><text x="127" y="50" fill="#34c99a">2</text><text x="249" y="153" fill="#e98c95">3</text></g>
<path d="M58 124H76" stroke="#60a5fa" stroke-width="3" marker-end="url(#arrowB)"/><path d="M147 54V81" stroke="#34c99a" stroke-width="3" marker-end="url(#arrowG)"/><path d="M261 157V177" stroke="#e98c95" stroke-width="3" marker-end="url(#arrowR)"/>
</svg>`;
let strokeExpanded=true;
function updateStrokeVisibility(){
 const panel=$('strokeContent'),button=$('strokeHeading'),pane=$('strokePane');
 panel.hidden=!strokeExpanded;
 pane.classList.toggle('collapsed',!strokeExpanded);
 button.setAttribute('aria-expanded',String(strokeExpanded));
 button.textContent='획순 안내('+(strokeExpanded?'표시 중':'접힘')+') '+(strokeExpanded?'▴':'▾');
 syncMobileNavigation();
}
function syncMobileNavigation(){
 const nav=document.querySelector('#learn .page-actions');
 const guideHeader=document.querySelector('#strokePane .pane-top');
 const writingToolbar=document.querySelector('#learn .lesson-toolbar');
 if(!nav||!guideHeader||!writingToolbar)return;
 const compact=window.matchMedia('(max-width:720px)').matches;
 const target=compact&&!strokeExpanded?guideHeader:writingToolbar;
 if(nav.parentElement!==target){if(target===guideHeader)target.append(nav);else target.prepend(nav);}
 guideHeader.classList.toggle('has-navigation',compact&&!strokeExpanded);
 writingToolbar.classList.toggle('navigation-relocated',compact&&!strokeExpanded);
}
window.addEventListener('resize',syncMobileNavigation);
$('strokeHeading').onclick=()=>{strokeExpanded=!strokeExpanded;updateStrokeVisibility()};
function renderStrokeOrder(){
 const el=$('strokeDiagram'),cap=$('strokeCaption');
 const paths=HIRAGANA_STROKES[kana[idx]]||[];
 const colors=['#60a5fa','#34c99a','#e98c95','#a78bfa','#f59e0b','#38bdf8'];
 const guides='<path d="M54.5 5V104 M5 54.5H104" stroke="#67c9ed" stroke-width=".6" stroke-dasharray="3 2" fill="none"/>';
 const strokes=paths.map((d,i)=>'<path d="'+d+'" fill="none" stroke="'+colors[i%colors.length]+'" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>').join('');
 const numbers=paths.map((d,i)=>{const m=d.match(/^M\\s*(-?\\d+(?:\\.\\d+)?)[,\\s]+(-?\\d+(?:\\.\\d+)?)/i);if(!m)return '';const x=Math.max(6,Math.min(96,Number(m[1])-8)),y=Math.max(10,Math.min(102,Number(m[2])-5));return '<text x="'+x+'" y="'+y+'" font-size="8" font-weight="700" fill="'+colors[i%colors.length]+'" stroke="white" stroke-width="2" paint-order="stroke">'+(i+1)+'</text>'}).join('');
 el.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109 109" role="img" aria-label="'+kana[idx]+' '+paths.length+'획 쓰는 순서">'+guides+strokes+numbers+'</svg>';
 cap.textContent=kana[idx]+' · '+paths.length+'획 · 숫자와 색상 순서대로 따라 쓰세요.';
 updateStrokeVisibility();
}

show();
