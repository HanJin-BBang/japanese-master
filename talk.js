/* 회화 마스터 엔진 (영어·일본어 공용). 내용은 course-*.js 의 COURSE_CONFIG 에서 가져와요.
   하루 10분: ① 복습(간격 반복) ② 새 대화(듣기 → 따라 말하기 → 내 역할 말하기) ③ 내 문장 만들기 */
(()=>{
const C=window.COURSE_CONFIG,KEY='talk-'+C.lang,$=id=>document.getElementById(id);
const GAPS=[1,3,7,14,30,60],REVIEW_CAP=15;
const today=()=>{const d=new Date();return Math.floor((d-d.getTimezoneOffset()*60000)/864e5)};
let S={cards:{},done:{},days:{},rate:1,auto:true};
try{Object.assign(S,JSON.parse(localStorage.getItem(KEY))||{})}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const DIALOGS=C.courses.flatMap(c=>c.dialogs.map(d=>Object.assign(d,{course:c.id})));
const lineOf=id=>{const[di,li]=id.split('#');const d=DIALOGS.find(x=>x.id===di);return d&&d.lines[+li]};
const rdHTML=l=>l&&l[3]&&l[3].replace(/\s/g,'')!==l[1].replace(/\s/g,'')?`<p class="rd">${esc(l[3])}</p>`:'';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ── 소리 ── */
let voice=null;
function pickVoice(){const vs=speechSynthesis.getVoices().filter(v=>v.lang.replace('_','-').startsWith(C.lang.slice(0,2)));voice=vs.find(v=>v.lang.replace('_','-')===C.lang&&/Google|Samsung|Natural/i.test(v.name))||vs.find(v=>v.lang.replace('_','-')===C.lang)||vs[0]||null}
if('speechSynthesis' in window){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function say(text,{lang=C.lang,rate=S.rate,pitch=1}={}){return new Promise(res=>{
  if(!('speechSynthesis' in window))return res();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=rate;u.pitch=pitch;
  if(lang===C.lang&&voice)u.voice=voice;let done=false;const fin=()=>{if(!done){done=true;res()}};u.onend=fin;u.onerror=fin;
  setTimeout(fin,1500+text.length*140/rate);speechSynthesis.speak(u)})}
const hush=()=>{try{speechSynthesis.cancel()}catch(e){}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* ── 말하기 확인 (마이크) ── */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const EXP={"i'm":'i am',"it's":'it is',"here's":'here is',"that's":'that is',"what's":'what is',"i'll":'i will',"i'd":'i would',"don't":'do not',"isn't":'is not',"can't":'cannot',"let's":'let us',"you're":'you are',"we're":'we are',"there's":'there is'};
function norm(s){
  if(C.lang.startsWith('ja'))return s.replace(/[、。！？!?,.\s「」]/g,'');
  return s.toLowerCase().replace(/[’`]/g,"'").split(/\s+/).map(w=>w.replace(/[^a-z0-9']/g,'')).filter(Boolean).map(w=>EXP[w]||w).join(' ').replace(/'/g,'');
}
function score(heard,target){
  if(Array.isArray(target))return Math.max(...target.filter(Boolean).map(t=>score(heard,t)));
  const a=norm(heard),b=norm(target);if(!a||!b)return 0;
  if(C.lang.startsWith('ja')){let m=0;const used=a.split('');for(const ch of b){const k=used.indexOf(ch);if(k>=0){m++;used.splice(k,1)}}return m/b.length}
  const hw=a.split(' '),tw=b.split(' ');let m=0;tw.forEach(w=>{const k=hw.indexOf(w);if(k>=0){m++;hw.splice(k,1)}});return m/tw.length;
}
function listen(target,out){return new Promise(res=>{
  if(!SR){res(null);return}
  const r=new SR();r.lang=C.lang;r.interimResults=true;r.maxAlternatives=3;let best='',bs=0,fin=false;
  out.innerHTML='<span class="rec">● 듣고 있어요… 말해 보세요</span>';
  r.onresult=e=>{for(const res_ of e.results)for(const alt of res_){const s=score(alt.transcript,target);if(s>=bs){bs=s;best=alt.transcript}}out.innerHTML=`<span class="rec">● ${esc(best)}</span>`};
  const end=()=>{if(fin)return;fin=true;res({text:best,score:bs})};
  r.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){out.textContent='마이크 권한이 없어서 확인할 수 없어요. 소리 내서 말한 뒤 정답을 보세요.'}end()};r.onend=end;
  try{r.start()}catch(e){end()}setTimeout(()=>{try{r.stop()}catch(e){}},8000);
})}
function micResult(res,out){
  if(!res){return}
  if(!res.text){out.innerHTML='<span class="muted">잘 안 들렸어요. 다시 해 보거나 정답을 보세요.</span>';return}
  const ok=res.score>=.75,near=res.score>=.45;
  out.innerHTML=`<span class="${ok?'good':near?'near':'muted'}">${ok?'통했어요! ✓':near?'거의 통했어요':'조금 달라요'}</span> <span class="heard">들린 말: ${esc(res.text)}</span>`;
  return ok;
}

/* ── 간격 반복 ── */
function addCard(id){if(!S.cards[id])S.cards[id]={box:0,due:today()+1}}
function dueCards(){const t=today();return Object.entries(S.cards).filter(([id,c])=>c.due<=t&&lineOf(id)).sort((a,b)=>a[1].due-b[1].due||a[1].box-b[1].box).slice(0,REVIEW_CAP).map(([id])=>id)}
function grade(id,ok){const c=S.cards[id];if(ok){c.box=Math.min(GAPS.length-1,c.box+1);c.due=today()+GAPS[c.box-1>=0?c.box-1:0]}else{c.box=0;c.due=today()+1}save()}
const focusCourse=()=>C.courses.find(c=>c.id===S.focus&&c.dialogs.length)||C.courses.find(c=>c.dialogs.length);
const nextDialog=()=>{const f=focusCourse();return(f&&f.dialogs.find(d=>!S.done[d.id]))||DIALOGS.find(d=>!S.done[d.id])};
function streak(){let n=0,t=today();if(!S.days[t])t--;while(S.days[t]){n++;t--}return n}

/* ── 홈 ── */
function home(){
  hush();stopListenOnly();const due=dueCards().length,nd=nextDialog(),st=streak(),todayDone=!!S.days[today()];
  $('app').innerHTML=`
  <section class="hero">
    <div class="streak"><b>${st}</b><span>일 연속</span></div>
    <h2>${todayDone?'오늘 할 일 끝! 더 해도 좋아요':'오늘의 10분'}</h2>
    <ul class="plan">
      <li><i>1</i>복습 <b>${due}개</b>${due?'':' <span class="muted">(오늘은 없어요)</span>'}</li>
      <li><i>2</i>새 대화 <b>${nd?esc(nd.title):'모두 끝!'}</b>${nd?` <span class="muted">· ${esc(C.courses.find(c=>c.id===nd.course).title)}</span>`:''}</li>
      <li><i>3</i>내 문장 만들기</li>
    </ul>
    <button class="big primary" id="go">${todayDone?'한 번 더 하기':'시작하기'}</button>
    <button class="big ghost" id="ear">🎧 듣기만 하기 <span class="muted">· 화면 안 보고 들어요</span></button>
  </section>
  ${C.courses.map(c=>{const n=c.dialogs.filter(d=>S.done[d.id]).length;return `
  <section class="course ${focusCourse()===c?'focus':''}"><div class="chead"><h3>${c.title}</h3><span class="muted">${c.soon?'준비 중':n+' / '+c.dialogs.length}</span>${c.soon||focusCourse()===c?'':`<button class="pick" data-c="${c.id}">이 코스로</button>`}${focusCourse()===c?'<span class="badge">지금 코스</span>':''}</div><p class="muted">${c.desc}</p>
    ${c.soon?'':`<div class="dlist">${c.dialogs.map((d,i)=>`<button class="dl ${S.done[d.id]?'ok':''}" data-d="${d.id}"><span class="num">${S.done[d.id]?'✓':i+1}</span>${esc(d.title)}</button>`).join('')}</div>`}</section>`}).join('')}
  ${(C.links||[]).map(l=>`<a class="linkcard" href="${l.href}"><b>${esc(l.label)}</b><span class="muted">${esc(l.desc||'')}</span></a>`).join('')}
  <section class="tools">
    <div class="row"><span>말하는 속도</span><div class="seg" id="rate">${[[.75,'느리게'],[.9,'조금 느리게'],[1,'보통']].map(([v,l])=>`<button data-r="${v}" aria-pressed="${S.rate==v}">${l}</button>`).join('')}</div></div>
    <div class="row"><button id="backup">진도 저장하기</button><button id="restore">진도 불러오기</button><button id="install">홈 화면에 설치</button></div>
    <p class="muted" id="toolMsg"></p><input type="file" id="file" accept="application/json" hidden>
    <p class="muted small">${SR?'말하기 확인: 마이크로 들린 문장이 맞는지 보여줘요 (발음 점수는 아니에요).':'이 브라우저는 마이크 확인을 지원하지 않아요. 소리 내서 말한 뒤 정답을 들어 보세요.'} · 앱 버전 ${window.APP_V||''}</p>
  </section>`;
  $('go').onclick=()=>startSession();
  $('ear').onclick=()=>listenOnly();
  document.querySelectorAll('.pick').forEach(b=>b.onclick=()=>{S.focus=b.dataset.c;save();home()});
  document.querySelectorAll('.dl').forEach(b=>b.onclick=()=>startSession(b.dataset.d));
  document.querySelectorAll('#rate button').forEach(b=>b.onclick=()=>{S.rate=+b.dataset.r;save();home();say(C.lang.startsWith('ja')?'こんにちは':'Hello!')});
  $('backup').onclick=()=>{const blob=new Blob([JSON.stringify(S)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=KEY+'-progress.json';a.click();$('toolMsg').textContent='진도 파일을 내려받았어요.'};
  $('restore').onclick=()=>$('file').click();
  $('file').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());if(typeof d.cards!=='object'||typeof d.done!=='object')throw 0;S=Object.assign({cards:{},done:{},days:{},rate:1},d);save();home();$('toolMsg').textContent='진도를 불러왔어요.'}catch(_){$('toolMsg').textContent='올바른 진도 파일이 아니에요.'}};
  $('install').onclick=async()=>{if(window.deferredPrompt){window.deferredPrompt.prompt();await window.deferredPrompt.userChoice;window.deferredPrompt=null;return}
    $('toolMsg').textContent=/SamsungBrowser/i.test(navigator.userAgent)?'삼성 인터넷: 메뉴(☰) → 현재 페이지 추가 → 홈 화면':'Chrome: 메뉴(⋮) → 홈 화면에 추가 → 설치'};
}

/* ── 공부 시간 ── */
let ses=null;
function frame(stepIdx,title,body){
  const steps=['복습','새 대화','내 문장'];
  $('app').innerHTML=`<div class="ses"><div class="stop"><button class="x" id="quit" aria-label="그만하기">✕</button>
    <div class="steps">${steps.map((s,i)=>`<span class="${i<stepIdx?'ok':i===stepIdx?'now':''}">${s}</span>`).join('<i>›</i>')}</div></div>
    <h2 class="stitle">${title}</h2><div id="body">${body}</div></div>`;
  $('quit').onclick=()=>{ses=null;home()};
}
function startSession(only){
  const nd=only?DIALOGS.find(d=>d.id===only):nextDialog();
  ses={queue:only?[]:dueCards(),again:[],dlg:nd,only:!!only,reviewed:0};
  if(ses.queue.length)reviewCard();else if(nd)dialogListen();else finish();
}
function reviewCard(){
  if(!ses)return;
  if(!ses.queue.length&&ses.again.length){ses.queue=ses.again;ses.again=[]}
  if(!ses.queue.length){if(ses.dlg)return dialogListen();return finish()}
  const id=ses.queue[0],L0=lineOf(id),[,en,ko]=L0,left=ses.queue.length+ses.again.length;
  frame(0,`복습 <span class="muted">· 남은 ${left}개</span>`,`
    <div class="card"><p class="ko big">${esc(ko)}</p><p class="hint">${C.langName}로 소리 내서 말해 보세요</p>
      <div class="answer" id="ans" hidden><p class="en">${esc(en)}</p>${rdHTML(L0)}</div><div class="mic" id="micOut"></div></div>
    <div class="actions">${SR?'<button class="big mic-btn" id="mic">🎤 말하기</button>':''}<button class="big ${SR?'ghost':'primary'}" id="show">정답 보기</button></div>
    <div class="actions" id="grade" hidden><button class="big warn" id="hard">헷갈렸어요</button><button class="big primary" id="easy">말했어요</button></div>`);
  const show=()=>{$('ans').hidden=false;$('grade').hidden=false;$('show').hidden=true;say(en)};
  $('show').onclick=show;
  if(SR)$('mic').onclick=async()=>{$('mic').disabled=true;const r=await listen([en,L0[3]],$('micOut'));$('mic').disabled=false;micResult(r,$('micOut'));show()};
  $('ans').onclick=()=>say(en);
  $('easy').onclick=()=>{grade(id,true);ses.queue.shift();ses.reviewed++;reviewCard()};
  $('hard').onclick=()=>{grade(id,false);ses.queue.shift();ses.again.push(id);ses.reviewed++;reviewCard()};
}
function lineHTML(l,i,mode){const me=l[0]==='B';
  return `<div class="line ${me?'me':'you'}" data-i="${i}"><span class="who">${me?'나':'상대'}</span><div class="bub"><p class="en">${mode==='hideMe'&&me?'<span class="blank">내 차례</span>':esc(l[1])}</p>${mode==='hideMe'&&me?'':rdHTML(l)}<p class="ko">${esc(l[2])}</p></div></div>`}
async function playLines(d,from=0,stopAt){
  const tok=ses.tok=Symbol();for(let i=from;i<(stopAt??d.lines.length);i++){if(!ses||ses.tok!==tok)return;
    document.querySelectorAll('.line').forEach(e=>e.classList.toggle('playing',+e.dataset.i===i));
    const l=d.lines[i];await say(l[1],{pitch:l[0]==='B'?1.05:.92});await wait(350)}
  document.querySelectorAll('.line').forEach(e=>e.classList.remove('playing'));
}
function dialogListen(){
  const d=ses.dlg;frame(1,`${esc(d.title)} <span class="muted">· ① 들어 보기</span>`,`
    <p class="hint">대화를 끝까지 들어 보세요. 줄을 누르면 그 줄만 다시 들려줘요.</p>
    <div class="talk">${d.lines.map((l,i)=>lineHTML(l,i)).join('')}</div>
    <div class="actions"><button class="big ghost" id="again">▶ 다시 듣기</button><button class="big primary" id="next">따라 말하기로</button></div>`);
  document.querySelectorAll('.line').forEach(e=>e.onclick=()=>{hush();say(d.lines[+e.dataset.i][1])});
  $('again').onclick=()=>{hush();playLines(d)};$('next').onclick=()=>{hush();dialogShadow(0)};
  setTimeout(()=>playLines(d),400);
}
function dialogShadow(i){
  const d=ses.dlg,l=d.lines[i];
  frame(1,`${esc(d.title)} <span class="muted">· ② 따라 말하기 ${i+1}/${d.lines.length}</span>`,`
    <p class="hint">듣고 바로 따라 말해요. 뜻을 생각하며 소리 내면 더 잘 남아요.</p>
    <div class="card shadow"><p class="en big">${esc(l[1])}</p>${rdHTML(l)}<p class="ko">${esc(l[2])}</p></div>
    <div class="actions"><button class="big ghost" id="rep">▶ 다시 듣기</button><button class="big ghost" id="slow">🐢 느리게</button></div>
    <div class="actions"><button class="big primary" id="next">${i<d.lines.length-1?'따라 했어요 → 다음':'따라 했어요 → 역할 말하기'}</button></div>`);
  $('rep').onclick=()=>{hush();say(l[1])};$('slow').onclick=()=>{hush();say(l[1],{rate:.65})};
  $('next').onclick=()=>{hush();i<d.lines.length-1?dialogShadow(i+1):dialogRole(0)};
  setTimeout(()=>say(l[1]),250);
}
async function dialogRole(i){
  const d=ses.dlg;if(i>=d.lines.length)return dialogDone();ses.roleI=i;
  frame(1,`${esc(d.title)} <span class="muted">· ③ 내 역할 말하기</span>`,`
    <p class="hint">상대 말을 듣고, '나' 차례에는 한국어를 보고 ${C.langName}로 말해요.</p>
    <div class="talk">${d.lines.slice(0,i+1).map((l,k)=>k<i?lineHTML(l,k):lineHTML(l,k,'hideMe')).join('')}</div>
    <div class="mic" id="micOut"></div><div class="actions" id="act"></div>`);
  const l=d.lines[i],act=$('act');document.querySelector('.talk').lastElementChild.scrollIntoView({block:'nearest'});
  if(l[0]==='A'){act.innerHTML='<button class="big ghost" id="rep">▶ 다시 듣기</button><button class="big primary" id="next">다음</button>';$('rep').onclick=()=>say(l[1]);$('next').onclick=()=>{hush();dialogRole(i+1)};
    await say(l[1],{pitch:.92});if(S.auto&&d.lines[i+1]&&ses&&ses.roleI===i)dialogRole(i+1);return}
  act.innerHTML=`${SR?'<button class="big mic-btn" id="mic">🎤 말하기</button>':''}<button class="big ${SR?'ghost':'primary'}" id="show">정답 보기</button>`;
  const reveal=()=>{const p=document.querySelector('.talk').lastElementChild.querySelector('.en');p.textContent=l[1];if(l[3])p.insertAdjacentHTML('afterend',rdHTML(l));
    act.innerHTML='<button class="big ghost" id="rep">▶ 다시 듣기</button><button class="big primary" id="next">다음</button>';$('rep').onclick=()=>say(l[1]);$('next').onclick=()=>{hush();dialogRole(i+1)};say(l[1])};
  $('show').onclick=reveal;
  if(SR)$('mic').onclick=async()=>{$('mic').disabled=true;const r=await listen([l[1],l[3]],$('micOut'));micResult(r,$('micOut'));reveal()};
}
function dialogDone(){
  const d=ses.dlg;S.done[d.id]=true;d.lines.forEach((l,i)=>{if(l[0]==='B')addCard(d.id+'#'+i)});save();
  dialogPattern();
}
function dialogPattern(){
  const d=ses.dlg,p=d.pattern;if(!p)return finish();
  frame(2,`내 문장 만들기`,`
    <div class="card"><p class="muted">오늘의 문장 틀</p><p class="en big">${esc(p.frame)}</p>${p.rd&&p.rd!==p.frame?`<p class="rd">${esc(p.rd)}</p>`:''}<p class="ko">${esc(p.ko)}</p>
      <div class="ex">${p.ex.map(([e,k,r])=>`<button class="exl" data-t="${esc(e)}"><b>${esc(e)}</b>${r&&r.replace(/\s/g,'')!==e.replace(/\s/g,'')?`<span class="rd">${esc(r)}</span>`:''}<span>${esc(k)}</span></button>`).join('')}</div></div>
    <p class="hint">빈칸에 <b>내 이야기</b>를 넣어서 두세 번 소리 내 말해 보세요. 정답은 없어요.</p>
    <div class="mic" id="micOut"></div>
    <div class="actions">${SR?'<button class="big mic-btn" id="mic">🎤 말해 보기</button>':''}<button class="big primary" id="next">말해 봤어요</button></div>`);
  document.querySelectorAll('.exl').forEach(b=>b.onclick=()=>say(b.dataset.t));
  if(SR)$('mic').onclick=async()=>{const r=await listen(p.frame.replace('___',''),$('micOut'));$('micOut').innerHTML=r&&r.text?`<span class="good">좋아요!</span> <span class="heard">들린 말: ${esc(r.text)}</span>`:'<span class="muted">잘 안 들렸어요. 한 번 더!</span>'};
  $('next').onclick=finish;
}
function finish(){
  hush();S.days[today()]=1;save();const st=streak(),r=ses?ses.reviewed:0,d=ses&&ses.dlg;ses=null;
  $('app').innerHTML=`<div class="ses done"><div class="fire">${st}</div><h2>${st}일 연속!</h2>
    <p>${r?`복습 ${r}개`:''}${r&&d?' · ':''}${d?`새 대화 「${esc(d.title)}」`:''}${!r&&!d?'오늘 할 복습과 대화를 모두 마쳤어요.':' 끝!'}</p>
    <p class="muted">오늘 말한 '나' 문장은 내일·3일 뒤·1주 뒤에 복습으로 다시 나와요.</p>
    <button class="big primary" id="home">처음으로</button></div>`;
  $('home').onclick=home;
}

/* ── 듣기만 하기: 한국어 → (생각할 틈) → 외국어 두 번 ── */
let ear=null;
function stopListenOnly(){if(ear){ear.stop=true;ear=null}}
async function listenOnly(){
  const ids=[...dueCards()],d=nextDialog()||DIALOGS[0];if(!ids.length)d.lines.forEach((l,i)=>{if(l[0]==='B')ids.push(d.id+'#'+i)});
  Object.keys(S.cards).forEach(id=>{if(!ids.includes(id)&&ids.length<20)ids.push(id)});
  const items=ids.map(lineOf).filter(Boolean);const me={stop:false};ear=me;
  $('app').innerHTML=`<div class="ses"><div class="stop"><button class="x" id="quit" aria-label="그만하기">✕</button><div class="steps"><span class="now">🎧 듣기만 하기</span></div></div>
    <div class="card ear"><p class="muted" id="eN"></p><p class="ko big" id="eK"></p><p class="en big" id="eE"></p></div>
    <p class="hint">한국어를 듣고, 잠깐 멈춘 사이에 먼저 말해 보세요. 화면이 꺼지면 소리가 멈출 수 있어요.</p>
    <div class="actions"><button class="big ghost" id="stop">그만하기</button></div></div>`;
  $('quit').onclick=$('stop').onclick=()=>{hush();stopListenOnly();home()};
  try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}
  for(let k=0;k<items.length;k++){if(me.stop)return;const[,en,ko]=items[k];
    $('eN').textContent=`${k+1} / ${items.length}`;$('eK').textContent=ko;$('eE').textContent='';
    await say(ko,{lang:'ko-KR',rate:1});if(me.stop)return;await wait(2600);if(me.stop)return;
    $('eE').textContent=en+(items[k][3]?'\n'+items[k][3]:'');await say(en);await wait(700);if(me.stop)return;await say(en);await wait(1200)}
  if(!me.stop){S.days[today()]=1;save();$('eK').textContent='다 들었어요!';$('eE').textContent='';$('eN').textContent=''}
}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.deferredPrompt=e});
home();
})();
